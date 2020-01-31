/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  getTopLevelUrlCompleteComponents,
  getEndpointBodyCompleteComponents,
  getGlobalAutocompleteComponents,
  getUnmatchedEndpointComponents,
} from './kb';
import utils from './utils';
import { populateContext } from './autocomplete/engine';
import { URL_PATH_END_MARKER } from './autocomplete/components';
import _ from 'lodash';
import ace from 'brace';
import { i18n } from '@kbn/i18n';

const AceRange = ace.acequire('ace/range').Range;

let LAST_EVALUATED_TOKEN = null;

function isUrlParamsToken(token) {
  switch ((token || {}).type) {
    case 'url.param':
    case 'url.equal':
    case 'url.value':
    case 'url.questionmark':
    case 'url.amp':
      return true;
    default:
      return false;
  }
}
function getCurrentMethodAndTokenPaths(editor, pos, forceEndOfUrl) {
  const tokenIter = editor.iterForPosition(pos.row, pos.column);
  const startPos = pos;
  let bodyTokenPath = [];
  const ret = {};

  const STATES = {
    looking_for_key: 0, // looking for a key but without jumping over anything but white space and colon.
    looking_for_scope_start: 1, // skip everything until scope start
    start: 3,
  };
  let state = STATES.start;

  // initialization problems -
  let t = tokenIter.getCurrentToken();
  if (t) {
    if (startPos.column === 0) {
      // if we are at the beginning of the line, the current token is the one after cursor, not before which
      // deviates from the standard.
      t = tokenIter.stepBackward();
      state = STATES.looking_for_scope_start;
    }
  } else {
    if (startPos.column === 0) {
      // empty lines do no have tokens, move one back
      t = tokenIter.stepBackward();
      state = STATES.start;
    }
  }

  let walkedSomeBody = false;

  // climb one scope at a time and get the scope key
  for (; t && t.type.indexOf('url') === -1 && t.type !== 'method'; t = tokenIter.stepBackward()) {
    if (t.type !== 'whitespace') {
      walkedSomeBody = true;
    } // marks we saw something

    switch (t.type) {
      case 'variable':
        if (state === STATES.looking_for_key) {
          bodyTokenPath.unshift(t.value.trim().replace(/"/g, ''));
        }
        state = STATES.looking_for_scope_start; // skip everything until the beginning of this scope
        break;

      case 'paren.lparen':
        bodyTokenPath.unshift(t.value);
        if (state === STATES.looking_for_scope_start) {
          // found it. go look for the relevant key
          state = STATES.looking_for_key;
        }
        break;
      case 'paren.rparen':
        // reset he search for key
        state = STATES.looking_for_scope_start;
        // and ignore this sub scope..
        let parenCount = 1;
        t = tokenIter.stepBackward();
        while (t && parenCount > 0) {
          switch (t.type) {
            case 'paren.lparen':
              parenCount--;
              break;
            case 'paren.rparen':
              parenCount++;
              break;
          }
          if (parenCount > 0) {
            t = tokenIter.stepBackward();
          }
        }
        if (!t) {
          // oops we run out.. we don't know what's up return null;
          return {};
        }
        continue;
      case 'punctuation.end_triple_quote':
        // reset the search for key
        state = STATES.looking_for_scope_start;
        for (t = tokenIter.stepBackward(); t; t = tokenIter.stepBackward()) {
          if (t.type === 'punctuation.start_triple_quote') {
            t = tokenIter.stepBackward();
            break;
          }
        }
        if (!t) {
          // oops we run out.. we don't know what's up return null;
          return {};
        }
        continue;
      case 'punctuation.start_triple_quote':
        if (state === STATES.start) {
          state = STATES.looking_for_key;
        } else if (state === STATES.looking_for_key) {
          state = STATES.looking_for_scope_start;
        }
        bodyTokenPath.unshift('"""');
        continue;
      case 'string':
      case 'constant.numeric':
      case 'constant.language.boolean':
      case 'text':
        if (state === STATES.start) {
          state = STATES.looking_for_key;
        } else if (state === STATES.looking_for_key) {
          state = STATES.looking_for_scope_start;
        }

        break;
      case 'punctuation.comma':
        if (state === STATES.start) {
          state = STATES.looking_for_scope_start;
        }
        break;
      case 'punctuation.colon':
      case 'whitespace':
        if (state === STATES.start) {
          state = STATES.looking_for_key;
        }
        break; // skip white space
    }
  }

  if (walkedSomeBody && (!bodyTokenPath || bodyTokenPath.length === 0)) {
    // we had some content and still no path -> the cursor is position after a closed body -> no auto complete
    return {};
  }
  ret.urlTokenPath = [];
  if (tokenIter.getCurrentTokenRow() === startPos.row) {
    if (t && (t.type === 'url.part' || t.type === 'url.param' || t.type === 'url.value')) {
      // we are forcing the end of the url for the purposes of determining an endpoint
      if (forceEndOfUrl && t.type === 'url.part') {
        ret.urlTokenPath.push(t.value);
        ret.urlTokenPath.push(URL_PATH_END_MARKER);
      }
      // we are on the same line as cursor and dealing with a url. Current token is not part of the context
      t = tokenIter.stepBackward();
      // This will force method parsing
      while (t.type === 'whitespace') {
        t = tokenIter.stepBackward();
      }
    }
    bodyTokenPath = null; // no not on a body line.
  }

  ret.bodyTokenPath = bodyTokenPath;

  ret.urlParamsTokenPath = null;
  ret.requestStartRow = tokenIter.getCurrentTokenRow();
  let curUrlPart;

  while (t && isUrlParamsToken(t)) {
    switch (t.type) {
      case 'url.value':
        if (Array.isArray(curUrlPart)) {
          curUrlPart.unshift(t.value);
        } else if (curUrlPart) {
          curUrlPart = [t.value, curUrlPart];
        } else {
          curUrlPart = t.value;
        }
        break;
      case 'url.comma':
        if (!curUrlPart) {
          curUrlPart = [];
        } else if (!Array.isArray(curUrlPart)) {
          curUrlPart = [curUrlPart];
        }
        break;
      case 'url.param':
        const v = curUrlPart;
        curUrlPart = {};
        curUrlPart[t.value] = v;
        break;
      case 'url.amp':
      case 'url.questionmark':
        if (!ret.urlParamsTokenPath) {
          ret.urlParamsTokenPath = [];
        }
        ret.urlParamsTokenPath.unshift(curUrlPart || {});
        curUrlPart = null;
        break;
    }
    t = tokenIter.stepBackward();
  }

  curUrlPart = null;
  while (t && t.type.indexOf('url') !== -1) {
    switch (t.type) {
      case 'url.part':
        if (Array.isArray(curUrlPart)) {
          curUrlPart.unshift(t.value);
        } else if (curUrlPart) {
          curUrlPart = [t.value, curUrlPart];
        } else {
          curUrlPart = t.value;
        }
        break;
      case 'url.comma':
        if (!curUrlPart) {
          curUrlPart = [];
        } else if (!Array.isArray(curUrlPart)) {
          curUrlPart = [curUrlPart];
        }
        break;
      case 'url.slash':
        if (curUrlPart) {
          ret.urlTokenPath.unshift(curUrlPart);
          curUrlPart = null;
        }
        break;
    }
    t = editor.parser.prevNonEmptyToken(tokenIter);
  }

  if (curUrlPart) {
    ret.urlTokenPath.unshift(curUrlPart);
  }

  if (!ret.bodyTokenPath && !ret.urlParamsTokenPath) {
    if (ret.urlTokenPath.length > 0) {
      //   // started on the url, first token is current token
      ret.otherTokenValues = ret.urlTokenPath[0];
    }
  } else {
    // mark the url as completed.
    ret.urlTokenPath.push(URL_PATH_END_MARKER);
  }

  if (t && t.type === 'method') {
    ret.method = t.value;
  }
  return ret;
}
export function getEndpointFromPosition(editor, pos) {
  const context = { ...getCurrentMethodAndTokenPaths(editor, pos, true) };
  const components = getTopLevelUrlCompleteComponents(context.method);
  populateContext(context.urlTokenPath, context, editor, true, components);
  return context.endpoint;
}
export default function(editor) {
  function isUrlPathToken(token) {
    switch ((token || {}).type) {
      case 'url.slash':
      case 'url.comma':
      case 'url.part':
        return true;
      default:
        return false;
    }
  }

  function addMetaToTermsList(list, meta, template) {
    return _.map(list, function(t) {
      if (typeof t !== 'object') {
        t = { name: t };
      }
      return _.defaults(t, { meta: meta, template: template });
    });
  }

  function applyTerm(term) {
    const session = editor.getSession();

    const context = term.context;

    // make sure we get up to date replacement info.
    addReplacementInfoToContext(context, editor.getCursorPosition(), term.insertValue);

    let termAsString;
    if (context.autoCompleteType === 'body') {
      termAsString =
        typeof term.insertValue === 'string' ? '"' + term.insertValue + '"' : term.insertValue + '';
      if (term.insertValue === '[' || term.insertValue === '{') {
        termAsString = '';
      }
    } else {
      termAsString = term.insertValue + '';
    }

    let valueToInsert = termAsString;
    let templateInserted = false;
    if (context.addTemplate && !_.isUndefined(term.template) && !_.isNull(term.template)) {
      let indentedTemplateLines;
      // In order to allow triple quoted strings in template completion we check the `__raw_`
      // attribute to determine whether this template should go through JSON formatting.
      if (term.template.__raw && term.template.value) {
        indentedTemplateLines = term.template.value.split('\n');
      } else {
        indentedTemplateLines = utils.jsonToString(term.template, true).split('\n');
      }
      let currentIndentation = session.getLine(context.rangeToReplace.start.row);
      currentIndentation = currentIndentation.match(/^\s*/)[0];
      for (
        let i = 1;
        i < indentedTemplateLines.length;
        i++ // skip first line
      ) {
        indentedTemplateLines[i] = currentIndentation + indentedTemplateLines[i];
      }

      valueToInsert += ': ' + indentedTemplateLines.join('\n');
      templateInserted = true;
    } else {
      templateInserted = true;
      if (term.value === '[') {
        valueToInsert += '[]';
      } else if (term.value === '{') {
        valueToInsert += '{}';
      } else {
        templateInserted = false;
      }
    }

    valueToInsert = context.prefixToAdd + valueToInsert + context.suffixToAdd;

    // disable listening to the changes we are making.
    removeChangeListener();

    if (context.rangeToReplace.start.column !== context.rangeToReplace.end.column) {
      session.replace(context.rangeToReplace, valueToInsert);
    } else {
      editor.insert(valueToInsert);
    }

    editor.clearSelection(); // for some reason the above changes selection

    // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
    let newPos = {
      row: context.rangeToReplace.start.row,
      column:
        context.rangeToReplace.start.column +
        termAsString.length +
        context.prefixToAdd.length +
        (templateInserted ? 0 : context.suffixToAdd.length),
    };

    const tokenIter = editor.iterForPosition(newPos.row, newPos.column);

    if (context.autoCompleteType === 'body') {
      // look for the next place stand, just after a comma, {
      let nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
      switch (nonEmptyToken ? nonEmptyToken.type : 'NOTOKEN') {
        case 'paren.rparen':
          newPos = {
            row: tokenIter.getCurrentTokenRow(),
            column: tokenIter.getCurrentTokenColumn(),
          };
          break;
        case 'punctuation.colon':
          nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
          if ((nonEmptyToken || {}).type === 'paren.lparen') {
            nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
            newPos = {
              row: tokenIter.getCurrentTokenRow(),
              column: tokenIter.getCurrentTokenColumn(),
            };
            if (nonEmptyToken && nonEmptyToken.value.indexOf('"') === 0) {
              newPos.column++;
            } // don't stand on "
          }
          break;
        case 'paren.lparen':
        case 'punctuation.comma':
          tokenIter.stepForward();
          newPos = {
            row: tokenIter.getCurrentTokenRow(),
            column: tokenIter.getCurrentTokenColumn(),
          };
          break;
      }
      editor.moveCursorToPosition(newPos);
    }

    // re-enable listening to typing
    addChangeListener();
  }

  function getAutoCompleteContext(editor, session, pos) {
    // deduces all the parameters need to position and insert the auto complete
    const context = {
      autoCompleteSet: null, // instructions for what can be here
      endpoint: null,
      urlPath: null,
      method: null,
      activeScheme: null,
      editor: editor,
    };

    //  context.updatedForToken = session.getTokenAt(pos.row, pos.column);
    //
    //  if (!context.updatedForToken)
    //    context.updatedForToken = { value: "", start: pos.column }; // empty line
    //
    //  context.updatedForToken.row = pos.row; // extend

    context.autoCompleteType = getAutoCompleteType(pos);
    switch (context.autoCompleteType) {
      case 'path':
        addPathAutoCompleteSetToContext(context, pos);
        break;
      case 'url_params':
        addUrlParamsAutoCompleteSetToContext(context, pos);
        break;
      case 'method':
        addMethodAutoCompleteSetToContext(context, pos);
        break;
      case 'body':
        addBodyAutoCompleteSetToContext(context, pos);
        break;
      default:
        return null;
    }

    if (!context.autoCompleteSet) {
      return null; // nothing to do..
    }

    addReplacementInfoToContext(context, pos);

    context.createdWithToken = _.clone(context.updatedForToken);

    return context;
  }

  function getAutoCompleteType(pos) {
    // return "method", "path" or "body" to determine auto complete type.

    let rowMode = editor.parser.getRowParseMode();

    //noinspection JSBitwiseOperatorUsage
    if (rowMode & editor.parser.MODE.IN_REQUEST) {
      return 'body';
    }
    //noinspection JSBitwiseOperatorUsage
    if (rowMode & editor.parser.MODE.REQUEST_START) {
      // on url path, url params or method.
      const tokenIter = editor.iterForPosition(pos.row, pos.column);
      let t = tokenIter.getCurrentToken();

      while (t.type === 'url.comma') {
        t = tokenIter.stepBackward();
      }
      switch (t.type) {
        case 'method':
          return 'method';
        case 'whitespace':
          t = editor.parser.prevNonEmptyToken(tokenIter);

          switch ((t || {}).type) {
            case 'method':
              // we moved one back
              return 'path';
              break;
            default:
              if (isUrlPathToken(t)) {
                return 'path';
              }
              if (isUrlParamsToken(t)) {
                return 'url_params';
              }
              return null;
          }
          break;
        default:
          if (isUrlPathToken(t)) {
            return 'path';
          }
          if (isUrlParamsToken(t)) {
            return 'url_params';
          }
          return null;
      }
    }

    // after start to avoid single line url only requests
    //noinspection JSBitwiseOperatorUsage
    if (rowMode & editor.parser.MODE.REQUEST_END) {
      return 'body';
    }

    // in between request on an empty
    if ((editor.getSession().getLine(pos.row) || '').trim() === '') {
      // check if the previous line is a single line begging of a new request
      rowMode = editor.parser.getRowParseMode(pos.row - 1);
      //noinspection JSBitwiseOperatorUsage
      if (rowMode & editor.parser.MODE.REQUEST_START && rowMode & editor.parser.MODE.REQUEST_END) {
        return 'body';
      }
      //o.w suggest a method
      return 'method';
    }

    return null;
  }

  function addReplacementInfoToContext(context, pos, replacingTerm) {
    // extract the initial value, rangeToReplace & textBoxPosition

    // Scenarios for current token:
    //   -  Nice token { "bla|"
    //   -  Broken text token {   bla|
    //   -  No token : { |
    //   - Broken scenario { , bla|
    //   - Nice token, broken before: {, "bla"

    const session = editor.getSession();

    context.updatedForToken = _.clone(session.getTokenAt(pos.row, pos.column));
    if (!context.updatedForToken) {
      context.updatedForToken = { value: '', start: pos.column };
    } // empty line

    let anchorToken = context.createdWithToken;
    if (!anchorToken) {
      anchorToken = context.updatedForToken;
    }

    switch (context.updatedForToken.type) {
      case 'variable':
      case 'string':
      case 'text':
      case 'constant.numeric':
      case 'constant.language.boolean':
      case 'method':
      case 'url.index':
      case 'url.type':
      case 'url.id':
      case 'url.method':
      case 'url.endpoint':
      case 'url.part':
      case 'url.param':
      case 'url.value':
        context.rangeToReplace = new AceRange(
          pos.row,
          anchorToken.start,
          pos.row,
          context.updatedForToken.start + context.updatedForToken.value.length
        );
        context.replacingToken = true;
        break;
      default:
        if (replacingTerm && context.updatedForToken.value === replacingTerm) {
          context.rangeToReplace = new AceRange(
            pos.row,
            anchorToken.start,
            pos.row,
            context.updatedForToken.start + context.updatedForToken.value.length
          );
          context.replacingToken = true;
        } else {
          // standing on white space, quotes or another punctuation - no replacing
          context.rangeToReplace = new AceRange(pos.row, pos.column, pos.row, pos.column);
          context.replacingToken = false;
        }
        break;
    }

    context.textBoxPosition = {
      row: context.rangeToReplace.start.row,
      column: context.rangeToReplace.start.column,
    };

    switch (context.autoCompleteType) {
      case 'path':
        addPathPrefixSuffixToContext(context);
        break;
      case 'url_params':
        addUrlParamsPrefixSuffixToContext(context);
        break;
      case 'method':
        addMethodPrefixSuffixToContext(context);
        break;
      case 'body':
        addBodyPrefixSuffixToContext(context);
        break;
    }
  }

  function addBodyPrefixSuffixToContext(context) {
    // Figure out what happens next to the token to see whether it needs trailing commas etc.

    // Templates will be used if not destroying existing structure.
    // -> token : {} or token ]/} or token , but not token : SOMETHING ELSE

    context.prefixToAdd = '';
    context.suffixToAdd = '';

    let tokenIter = editor.iterForCurrentLoc();
    let nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
    switch (nonEmptyToken ? nonEmptyToken.type : 'NOTOKEN') {
      case 'NOTOKEN':
      case 'paren.lparen':
      case 'paren.rparen':
      case 'punctuation.comma':
        context.addTemplate = true;
        break;
      case 'punctuation.colon':
        // test if there is an empty object - if so we replace it
        context.addTemplate = false;

        nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
        if (!(nonEmptyToken && nonEmptyToken.value === '{')) {
          break;
        }
        nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
        if (!(nonEmptyToken && nonEmptyToken.value === '}')) {
          break;
        }
        context.addTemplate = true;
        // extend range to replace to include all up to token
        context.rangeToReplace.end.row = tokenIter.getCurrentTokenRow();
        context.rangeToReplace.end.column =
          tokenIter.getCurrentTokenColumn() + nonEmptyToken.value.length;

        // move one more time to check if we need a trailing comma
        nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
        switch (nonEmptyToken ? nonEmptyToken.type : 'NOTOKEN') {
          case 'NOTOKEN':
          case 'paren.rparen':
          case 'punctuation.comma':
          case 'punctuation.colon':
            break;
          default:
            context.suffixToAdd = ', ';
        }

        break;
      default:
        context.addTemplate = true;
        context.suffixToAdd = ', ';
        break; // for now play safe and do nothing. May be made smarter.
    }

    // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
    tokenIter = editor.iterForCurrentLoc();
    nonEmptyToken = tokenIter.getCurrentToken();
    let insertingRelativeToToken; // -1 is before token, 0 middle, +1 after token
    if (context.replacingToken) {
      insertingRelativeToToken = 0;
    } else {
      const pos = editor.getCursorPosition();
      if (pos.column === context.updatedForToken.start) {
        insertingRelativeToToken = -1;
      } else if (
        pos.column <
        context.updatedForToken.start + context.updatedForToken.value.length
      ) {
        insertingRelativeToToken = 0;
      } else {
        insertingRelativeToToken = 1;
      }
    }
    // we should actually look at what's happening before this token
    if (editor.parser.isEmptyToken(nonEmptyToken) || insertingRelativeToToken <= 0) {
      nonEmptyToken = editor.parser.prevNonEmptyToken(tokenIter);
    }

    switch (nonEmptyToken ? nonEmptyToken.type : 'NOTOKEN') {
      case 'NOTOKEN':
      case 'paren.lparen':
      case 'punctuation.comma':
      case 'punctuation.colon':
      case 'method':
        break;
      default:
        if (nonEmptyToken && nonEmptyToken.type.indexOf('url') < 0) {
          context.prefixToAdd = ', ';
        }
    }

    return context;
  }

  function addUrlParamsPrefixSuffixToContext(context) {
    context.prefixToAdd = '';
    context.suffixToAdd = '';
  }

  function addMethodPrefixSuffixToContext(context) {
    context.prefixToAdd = '';
    context.suffixToAdd = '';
    const tokenIter = editor.iterForCurrentLoc();
    const row = tokenIter.getCurrentTokenRow();
    const t = editor.parser.nextNonEmptyToken(tokenIter);

    if (tokenIter.getCurrentTokenRow() !== row || !t) {
      // we still have nothing next to the method, add a space..
      context.suffixToAdd = ' ';
    }
  }

  function addPathPrefixSuffixToContext(context) {
    context.prefixToAdd = '';
    context.suffixToAdd = '';
  }

  function addMethodAutoCompleteSetToContext(context) {
    context.autoCompleteSet = ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'].map((m, i) => ({
      name: m,
      score: -i,
      meta: i18n.translate('console.autocomplete.addMethodMetaText', { defaultMessage: 'method' }),
    }));
  }

  function addPathAutoCompleteSetToContext(context, pos) {
    const ret = getCurrentMethodAndTokenPaths(editor, pos);
    context.method = ret.method;
    context.token = ret.token;
    context.otherTokenValues = ret.otherTokenValues;
    context.urlTokenPath = ret.urlTokenPath;
    const components = getTopLevelUrlCompleteComponents(context.method);
    populateContext(ret.urlTokenPath, context, editor, true, components);

    context.autoCompleteSet = addMetaToTermsList(context.autoCompleteSet, 'endpoint');
  }

  function addUrlParamsAutoCompleteSetToContext(context, pos) {
    const ret = getCurrentMethodAndTokenPaths(editor, pos);
    context.method = ret.method;
    context.otherTokenValues = ret.otherTokenValues;
    context.urlTokenPath = ret.urlTokenPath;
    if (!ret.urlTokenPath) {
      // zero length tokenPath is true

      console.log("Can't extract a valid url token path.");
      return context;
    }

    populateContext(
      ret.urlTokenPath,
      context,
      editor,
      false,
      getTopLevelUrlCompleteComponents(context.method)
    );

    if (!context.endpoint) {
      console.log("couldn't resolve an endpoint.");
      return context;
    }

    if (!ret.urlParamsTokenPath) {
      // zero length tokenPath is true
      console.log("Can't extract a valid urlParams token path.");
      return context;
    }
    let tokenPath = [];
    const currentParam = ret.urlParamsTokenPath.pop();
    if (currentParam) {
      tokenPath = Object.keys(currentParam); // single key object
      context.otherTokenValues = currentParam[tokenPath[0]];
    }

    populateContext(
      tokenPath,
      context,
      editor,
      true,
      context.endpoint.paramsAutocomplete.getTopLevelComponents(context.method)
    );
    return context;
  }

  function addBodyAutoCompleteSetToContext(context, pos) {
    const ret = getCurrentMethodAndTokenPaths(editor, pos);
    context.method = ret.method;
    context.otherTokenValues = ret.otherTokenValues;
    context.urlTokenPath = ret.urlTokenPath;
    context.requestStartRow = ret.requestStartRow;
    if (!ret.urlTokenPath) {
      // zero length tokenPath is true
      console.log("Can't extract a valid url token path.");
      return context;
    }

    populateContext(
      ret.urlTokenPath,
      context,
      editor,
      false,
      getTopLevelUrlCompleteComponents(context.method)
    );

    context.bodyTokenPath = ret.bodyTokenPath;
    if (!ret.bodyTokenPath) {
      // zero length tokenPath is true

      console.log("Can't extract a valid body token path.");
      return context;
    }

    // needed for scope linking + global term resolving
    context.endpointComponentResolver = getEndpointBodyCompleteComponents;
    context.globalComponentResolver = getGlobalAutocompleteComponents;
    let components;
    if (context.endpoint) {
      components = context.endpoint.bodyAutocompleteRootComponents;
    } else {
      components = getUnmatchedEndpointComponents();
    }
    populateContext(ret.bodyTokenPath, context, editor, true, components);

    return context;
  }

  const evaluateCurrentTokenAfterAChange = _.debounce(function evaluateCurrentTokenAfterAChange(
    pos
  ) {
    const session = editor.getSession();
    let currentToken = session.getTokenAt(pos.row, pos.column);

    if (!currentToken) {
      if (pos.row === 0) {
        LAST_EVALUATED_TOKEN = null;
        return;
      }
      currentToken = { start: 0, value: '' }; // empty row
    }

    currentToken.row = pos.row; // extend token with row. Ace doesn't supply it by default
    if (editor.parser.isEmptyToken(currentToken)) {
      // empty token. check what's coming next
      const nextToken = session.getTokenAt(pos.row, pos.column + 1);
      if (editor.parser.isEmptyToken(nextToken)) {
        // Empty line, or we're not on the edge of current token. Save the current position as base
        currentToken.start = pos.column;
        LAST_EVALUATED_TOKEN = currentToken;
      } else {
        nextToken.row = pos.row;
        LAST_EVALUATED_TOKEN = nextToken;
      }
      return;
    }

    if (!LAST_EVALUATED_TOKEN) {
      LAST_EVALUATED_TOKEN = currentToken;
      return; // wait for the next typing.
    }

    if (
      LAST_EVALUATED_TOKEN.start !== currentToken.start ||
      LAST_EVALUATED_TOKEN.row !== currentToken.row ||
      LAST_EVALUATED_TOKEN.value === currentToken.value
    ) {
      // not on the same place or nothing changed, cache and wait for the next time
      LAST_EVALUATED_TOKEN = currentToken;
      return;
    }

    // don't automatically open the auto complete if some just hit enter (new line) or open a parentheses
    switch (currentToken.type || 'UNKNOWN') {
      case 'paren.lparen':
      case 'paren.rparen':
      case 'punctuation.colon':
      case 'punctuation.comma':
      case 'UNKNOWN':
        return;
    }

    LAST_EVALUATED_TOKEN = currentToken;
    editor.execCommand('startAutocomplete');
  },
  100);

  function editorChangeListener() {
    const cursor = editor.selection.lead;
    if (editor.__ace.completer && editor.__ace.completer.activated) {
      return;
    }
    evaluateCurrentTokenAfterAChange(cursor);
  }

  function addChangeListener() {
    editor.on('changeSelection', editorChangeListener);
  }

  function removeChangeListener() {
    editor.off('changeSelection', editorChangeListener);
  }

  function getCompletions(aceEditor, session, pos, prefix, callback) {
    try {
      const context = getAutoCompleteContext(editor, session, pos);
      if (!context) {
        callback(null, []);
      } else {
        const terms = _.map(
          context.autoCompleteSet.filter(term => Boolean(term) && term.name != null),
          function(term) {
            if (typeof term !== 'object') {
              term = {
                name: term,
              };
            } else {
              term = _.clone(term);
            }
            const defaults = {
              value: term.name,
              meta: 'API',
              score: 0,
              context: context,
            };
            // we only need out custom insertMatch behavior for the body
            if (context.autoCompleteType === 'body') {
              defaults.completer = {
                insertMatch: function() {
                  return applyTerm(term);
                },
              };
            }
            return _.defaults(term, defaults);
          }
        );

        terms.sort(function(t1, t2) {
          /* score sorts from high to low */
          if (t1.score > t2.score) {
            return -1;
          }
          if (t1.score < t2.score) {
            return 1;
          }
          /* names sort from low to high */
          if (t1.name < t2.name) {
            return -1;
          }
          if (t1.name === t2.name) {
            return 0;
          }
          return 1;
        });

        callback(
          null,
          _.map(terms, function(t, i) {
            t.insertValue = t.insertValue || t.value;
            t.value = '' + t.value; // normalize to strings
            t.score = -i;
            return t;
          })
        );
      }
    } catch (e) {
      console.log('error while getting completion terms', e);
      callback(e, null);
    }
  }

  addChangeListener();

  // Hook into Ace

  // disable standard context based autocompletion.
  ace.define('ace/autocomplete/text_completer', ['require', 'exports', 'module'], function(
    require,
    exports
  ) {
    exports.getCompletions = function(editor, session, pos, prefix, callback) {
      callback(null, []);
    };
  });

  const langTools = ace.acequire('ace/ext/language_tools');

  langTools.setCompleters([
    {
      identifierRegexps: [
        /[a-zA-Z_0-9\.\$\-\u00A2-\uFFFF]/, // adds support for dot character
      ],
      getCompletions: getCompletions,
    },
  ]);

  editor.setOptions({
    enableBasicAutocompletion: true,
  });
  editor.$blockScrolling = Infinity;
  return {
    _test: {
      getCompletions: getCompletions,
      addReplacementInfoToContext: addReplacementInfoToContext,
      addChangeListener: addChangeListener,
      removeChangeListener: removeChangeListener,
    },
  };
}
