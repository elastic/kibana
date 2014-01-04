define([
  'ace',
  'history',
  'kb/index',
  'mappings',
  'jquery',
  'utils',
  
  'jquery-ui'
], function (ace, history, kb, mappings, $, utils) {
  'use strict';

  var MODE_INACTIVE = 0, MODE_VISIBLE = 1, MODE_APPLYING_TERM = 2, MODE_FORCED_CLOSE = 3;
  var MODE = MODE_INACTIVE;
  var ACTIVE_MENU = null;
  var ACTIVE_CONTEXT = null;
  var LAST_EVALUATED_TOKEN = null;

  function Autocomplete(editor) {

    function getAutoCompleteValueFromToken(token) {
      switch ((token || {}).type) {
      case "variable":
      case "string":
      case "text":
      case "constant.numeric":
      case "constant.language.boolean":
        return token.value.replace(/"/g, '');
      case "method":
      case "url.index":
      case "url.type":
      case "url.part":
      case "url.endpoint":
        return token.value;
      default:
        // standing on white space, quotes or another punctuation - no replacing
        return "";
      }
    }

    var visibleMenuAceCMDS = [
      {
        name: "golinedown",
        exec: function () {
          ACTIVE_MENU.focus();
        },
        bindKey: "Down"
      },
      {
        name: "select_autocomplete",
        exec: function () {
          ACTIVE_MENU.menu("focus", null, ACTIVE_MENU.find(".ui-menu-item:first"));
          ACTIVE_MENU.menu("select");
          return true;
        },
        bindKey: "Enter"
      },
      {
        name: "indent",
        exec: function () {
          ACTIVE_MENU.menu("focus", null, ACTIVE_MENU.find(".ui-menu-item:first"));
          ACTIVE_MENU.menu("select");
          return true;
        },
        bindKey: "Tab"
      },
      {
        name: "singleSelection",
        exec: function () {
          hideAutoComplete();
          MODE = MODE_FORCED_CLOSE;
          return true;
        },
        bindKey: "Esc"
      }
    ];

    var _cached_cmds_to_restore = [];


    function hideAutoComplete() {
      if (MODE != MODE_VISIBLE) return;
      editor.commands.removeCommands(visibleMenuAceCMDS);
      editor.commands.addCommands(_cached_cmds_to_restore);
      ACTIVE_MENU.css("left", "-1000px");
      MODE = MODE_INACTIVE;
    }

    function termToFilterRegex(term, prefix, suffix) {
      if (!prefix) prefix = "";
      if (!suffix) suffix = "";

      return new RegExp(prefix + term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + suffix, 'i');
    }

    function updateAutoComplete(hideIfSingleItemAndEqualToTerm) {

      var pos = editor.getCursorPosition();
      var token = editor.getSession().getTokenAt(pos.row, pos.column);
      var term = getAutoCompleteValueFromToken(token);
      console.log("Updating autocomplete for " + term);
      ACTIVE_CONTEXT.updatedForToken = token || { row: pos.row, start: pos.column };

      var term_filter = termToFilterRegex(term);
      var term_filter_prefix = termToFilterRegex(term, "^_?");

      var possible_terms = ACTIVE_CONTEXT.autoCompleteSet.completionTerms;
      ACTIVE_MENU.children().remove();
      var lastPrefixMatch = null;
      var menuCount = 0, lastTerm = null;
      for (var i = 0; i < possible_terms.length; i++) {
        var term_as_string = possible_terms[i] + "";
        if (term_as_string.match(term_filter_prefix)) {
          menuCount++;
          lastTerm = possible_terms[i];
          if (lastPrefixMatch) {
            lastPrefixMatch = $('<li></li>').insertAfter(lastPrefixMatch).append($('<a tabindex="-1" href="#"></a>').
              text(possible_terms[i])).data("term_id", i);
          }
          else {
            lastPrefixMatch = $('<li></li>').prependTo(ACTIVE_MENU).append($('<a tabindex="-1" href="#"></a>').
              text(possible_terms[i])).data("term_id", i);
          }
          continue;
        }
        if (term_as_string.match(term_filter)) {
          menuCount++;
          lastTerm = possible_terms[i];
          $('<li></li>').appendTo(ACTIVE_MENU)
            .append($('<a tabindex="-1" href="#"></a>').text(possible_terms[i])).data("term_id", i);
        }

      }

      if (hideIfSingleItemAndEqualToTerm && lastTerm == term) menuCount--;

      ACTIVE_MENU.menu("refresh");
      if (menuCount > 0) {
        return true;
      } else {
        hideAutoComplete();
        return false;
      }
    }

    function showAutoComplete(force) {
      hideAutoComplete();


      var context = getAutoCompleteContext();
      ACTIVE_CONTEXT = context;
      if (!context) return; // nothing to do

      var screen_pos = editor.renderer.textToScreenCoordinates(context.textBoxPosition.row,
        context.textBoxPosition.column);

      ACTIVE_MENU.css('visibility', 'visible');
      _cached_cmds_to_restore = $.map(visibleMenuAceCMDS, function (cmd) {
        return  editor.commands.commands[cmd.name];
      });


      editor.commands.addCommands(visibleMenuAceCMDS);


      MODE = MODE_VISIBLE;

      if (!updateAutoComplete(!force)) return; // update has hid the menu

      ACTIVE_MENU.css("left", screen_pos.pageX);
      ACTIVE_MENU.css("top", screen_pos.pageY);
    }

    function applyTerm(term) {
      var session = editor.getSession();

      var context = ACTIVE_CONTEXT;

      hideAutoComplete();

      MODE = MODE_APPLYING_TERM;

      // make sure we get up to date replacement info.
      addReplacementInfoToContext(context, term);

      var termAsString;
      if (context.autoCompleteType == "body") {
        termAsString = typeof term == "string" ? '"' + term + '"' : term + "";
        if (term == "[" || term == "{") termAsString = "";
      }
      else {
        termAsString = term + "";
      }

      var valueToInsert = termAsString;
      var templateInserted = false;
      if (context.addTemplate && typeof context.autoCompleteSet.templateByTerm[term] != "undefined") {
        var indentedTemplateLines = JSON.stringify(context.autoCompleteSet.templateByTerm[term], null, 3).split("\n");
        var currentIndentation = session.getLine(context.rangeToReplace.start.row);
        currentIndentation = currentIndentation.match(/^\s*/)[0];
        for (var i = 1; i < indentedTemplateLines.length; i++) // skip first line
          indentedTemplateLines[i] = currentIndentation + indentedTemplateLines[i];

        valueToInsert += ": " + indentedTemplateLines.join("\n");
        templateInserted = true;
      } else {
        templateInserted = true;
        if (term == "[") valueToInsert += "[]";
        else if (term == "{") valueToInsert += "{}";
        else {
          templateInserted = false;
        }
      }

      valueToInsert = context.prefixToAdd + valueToInsert + context.suffixToAdd;


      if (context.rangeToReplace.start.column != context.rangeToReplace.end.column)
        session.replace(context.rangeToReplace, valueToInsert);
      else
        editor.insert(valueToInsert);

      editor.clearSelection(); // for some reason the above changes selection

      // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
      var newPos = {
        row: context.rangeToReplace.start.row,
        column: context.rangeToReplace.start.column + termAsString.length + context.prefixToAdd.length
          + (templateInserted ? 0 : context.suffixToAdd.length)
      };

      var tokenIter = new (ace.require("ace/token_iterator").TokenIterator)(editor.getSession(),
        newPos.row, newPos.column);

      // look for the next place stand, just after a comma, {
      var nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
      case "paren.rparen":
        newPos = { row: tokenIter.getCurrentTokenRow(), column: tokenIter.getCurrentTokenColumn() };
        break;
      case "punctuation.colon":
        nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
        if ((nonEmptyToken || {}).type == "paren.lparen") {
          nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
          newPos = { row: tokenIter.getCurrentTokenRow(), column: tokenIter.getCurrentTokenColumn() };
          if (nonEmptyToken && nonEmptyToken.value.indexOf('"') === 0) newPos.column++; // don't stand on "
        }
        break;
      case "paren.lparen":
      case "punctuation.comma":
        tokenIter.stepForward();
        newPos = { row: tokenIter.getCurrentTokenRow(), column: tokenIter.getCurrentTokenColumn() };
        break;
      }


      editor.moveCursorToPosition(newPos);


      MODE = MODE_INACTIVE;

      editor.focus();
    }

    function getAutoCompleteContext() {
      // deduces all the parameters need to position and insert the auto complete
      var context = {
        updatedForToken: null,
        prefixToAdd: "",
        suffixToAdd: "",
        addTemplate: false,
        textBoxPosition: null, // ace position to place the left side of the input box
        rangeToReplace: null, // ace range to replace with the auto complete
        autoCompleteSet: null, // instructions for what can be here
        replacingToken: false,
        endpoint: null,
        urlPath: null,
        method: null,
        activeScheme: null
      };

      var pos = editor.getCursorPosition();
      var session = editor.getSession();
      context.updatedForToken = session.getTokenAt(pos.row, pos.column);

      if (!context.updatedForToken)
        context.updatedForToken = { value: "", start: pos.column }; // empty line

      context.updatedForToken.row = pos.row; // extend

      context.autoCompleteType = getAutoCompleteType();
      switch (context.autoCompleteType) {
      case "type":
        addTypeAutoCompleteSetToContext(context);
        break;
      case "index":
        addIndexAutoCompleteSetToContext(context);
        break;
      case "endpoint":
        addEndpointAutoCompleteSetToContext(context);
        break;
      case "method":
        addMethodAutoCompleteSetToContext(context);
        break;
      case "body":
        addBodyAutoCompleteSetToContext(context);
        break;
      default:
        return null;
      }


      if (!context.autoCompleteSet
        || !context.autoCompleteSet.completionTerms
        || context.autoCompleteSet.completionTerms.length === 0
      ) {
        return null; // nothing to do..
      }

      addReplacementInfoToContext(context);

      return context;
    }

    function getAutoCompleteType() {
      // return "method", "index", "type" ,"id" or "body" to determine auto complete type.
      var tokenIter = editor.iterForCurrentLoc();
      var startRow = tokenIter.getCurrentTokenRow();
      var t = tokenIter.getCurrentToken();

      function checkIfStandingAfterBody() {
        if (!t) return "method"; // there is really nothing
        if (t.type != "paren.rparen") return "body"; // if we don't encounter a } where are not after the body
        // too bad , have to count parentheses..
        var openParam = 1;
        while (openParam > 0 && (t = editor.parser.prevNonEmptyToken(tokenIter)) && !editor.parser.isUrlOrMethodToken(t)) {
          if (t.type == "paren.rparen") openParam++;
          else if (t.type == "paren.lparen") openParam--;
        }
        if (openParam > 0) return "body"; // parens didn't match up. We are in body land.

        // what do we have before if it is the url -> we skipped the whole body
        t = editor.parser.prevNonEmptyToken(tokenIter);
        if (t && editor.parser.isUrlOrMethodToken(t)) return "method";

        return "body"; // we are halfway the body somewhere...
      }

      // where are standing on an empty line, just check if we are starting a new request
      if (!t) {
        t = editor.parser.prevNonEmptyToken(tokenIter);
        return checkIfStandingAfterBody();
      }


      if (t.type == "url.comma") t = tokenIter.stepBackward();

      switch (t.type) {
      case "comment":
        return null;
      case "url.type":
        return "type";
      case "url.index":
        return "index";
      case "url.id":
        return "id";
      case "url.part":
      case "url.endpoint":
        return "endpoint";
      case "method":
        return "method";
      case "url.slash":
        t = tokenIter.stepBackward();
        switch ((t || {}).type) {
        case "url.type":
          return "id";
        case "url.index":
          return "type";
        case "url.endpoint":
        case "url.part":
          return "endpoint";
        case "whitespace":
          return "index";
        default:
          return null;
        }
        /* falls through */
      default:
        if (t.type.indexOf("url") === 0) return null;

        // check if we are beyond the body and should start a new request
        // but only we have a new line between current pos and the body.
        t = editor.parser.prevNonEmptyToken(tokenIter);
        if (t && tokenIter.getCurrentTokenRow() < startRow) {
          return checkIfStandingAfterBody();
        }

        return "body";
      }
    }

    function addReplacementInfoToContext(context, replacingTerm) {
      // extract the initial value, rangeToReplace & textBoxPosition

      // Scenarios for current token:
      //   -  Nice token { "bla|"
      //   -  Broken text token {   bla|
      //   -  No token : { |
      //   - Broken scenario { , bla|
      //   - Nice token, broken before: {, "bla"

      var pos = editor.getCursorPosition();
      var session = editor.getSession();
      var insertingRelativeToToken;

      context.updatedForToken = session.getTokenAt(pos.row, pos.column);
      if (!context.updatedForToken)
        context.updatedForToken = { value: "", start: pos.column }; // empty line


      switch (context.updatedForToken.type) {
      case "variable":
      case "string":
      case "text":
      case "constant.numeric":
      case "constant.language.boolean":
      case "method":
      case "url.index":
      case "url.type":
      case "url.id":
      case "url.method":
      case "url.endpoint":
      case "url.part":
        insertingRelativeToToken = 0;
        context.rangeToReplace = new (ace.require("ace/range").Range)(
          pos.row, context.updatedForToken.start, pos.row,
          context.updatedForToken.start + context.updatedForToken.value.length
        );
        context.replacingToken = true;
        break;
      default:
        if (replacingTerm && context.updatedForToken.value == replacingTerm) {
          insertingRelativeToToken = 0;
          context.rangeToReplace = new (ace.require("ace/range").Range)(
            pos.row, context.updatedForToken.start, pos.row,
            context.updatedForToken.start + context.updatedForToken.value.length
          );
          context.replacingToken = true;
        }
        else {
          // standing on white space, quotes or another punctuation - no replacing
          context.rangeToReplace = new (ace.require("ace/range").Range)(
            pos.row, pos.column, pos.row, pos.column
          );
          context.replacingToken = false;
        }
        break;
      }

      context.textBoxPosition = { row: context.rangeToReplace.start.row, column: context.rangeToReplace.start.column};

      switch (context.autoCompleteType) {
      case "type":
        addTypePrefixSuffixToContext(context);
        break;
      case "index":
        addIndexPrefixSuffixToContext(context);
        break;
      case "endpoint":
        addEndpointPrefixSuffixToContext(context);
        break;
      case "method":
        addMethodPrefixSuffixToContext(context);
        break;
      case "body":
        addBodyPrefixSuffixToContext(context);
        break;
      }
    }

    function addBodyPrefixSuffixToContext(context) {
      // Figure out what happens next to the token to see whether it needs trailing commas etc.

      // Templates will be used if not destroying existing structure.
      // -> token : {} or token ]/} or token , but not token : SOMETHING ELSE

      context.prefixToAdd = "";
      context.suffixToAdd = "";

      var tokenIter = editor.iterForCurrentLoc();
      var nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
      case "NOTOKEN":
      case "paren.lparen":
      case "paren.rparen":
      case "punctuation.comma":
        context.addTemplate = true;
        break;
      case "punctuation.colon":
        // test if there is an empty object - if so we replace it
        context.addTemplate = false;

        nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
        if (!(nonEmptyToken && nonEmptyToken.value == "{")) break;
        nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
        if (!(nonEmptyToken && nonEmptyToken.value == "}")) break;
        context.addTemplate = true;
        // extend range to replace to include all up to token
        context.rangeToReplace.end.row = tokenIter.getCurrentTokenRow();
        context.rangeToReplace.end.column = tokenIter.getCurrentTokenColumn() + nonEmptyToken.value.length;

        // move one more time to check if we need a trailing comma
        nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
        switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
        case "NOTOKEN":
        case "paren.rparen":
        case "punctuation.comma":
        case "punctuation.colon":
          break;
        default:
          context.suffixToAdd = ", "
        }

        break;
      default:
        context.addTemplate = true;
        context.suffixToAdd = ", ";
        break; // for now play safe and do nothing. May be made smarter.
      }


      // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
      tokenIter = editor.iterForCurrentLoc();
      nonEmptyToken = tokenIter.getCurrentToken();
      var insertingRelativeToToken; // -1 is before token, 0 middle, +1 after token
      if (context.replacingToken) {
        insertingRelativeToToken = 0;
      }
      else {
        var pos = editor.getCursorPosition();
        if (pos.column == context.updatedForToken.start)
          insertingRelativeToToken = -1;
        else if (pos.column < context.updatedForToken.start + context.updatedForToken.value.length)
          insertingRelativeToToken = 0;
        else
          insertingRelativeToToken = 1;

      }
      // we should actually look at what's happening before this token
      if (editor.parser.isEmptyToken(nonEmptyToken) || insertingRelativeToToken <= 0) {
        nonEmptyToken = editor.parser.prevNonEmptyToken(tokenIter);
      }


      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
      case "NOTOKEN":
      case "paren.lparen":
      case "punctuation.comma":
      case "punctuation.colon":
      case "method":
        break;
      default:
        if (!nonEmptyToken || !nonEmptyToken.type.indexOf("url") === 0)
          context.prefixToAdd = ", "
      }

      return context;
    }

    function addMethodPrefixSuffixToContext(context) {
      context.prefixToAdd = "";
      context.suffixToAdd = "";
      var tokenIter = editor.iterForCurrentLoc();
      var row = tokenIter.getCurrentTokenRow();
      var t = editor.parser.nextNonEmptyToken(tokenIter);

      if (tokenIter.getCurrentTokenRow() != row || !t) {
        // we still have nothing next to the method, add a space..
        context.suffixToAdd = " ";
      }
    }

    function addTypePrefixSuffixToContext(context) {
      context.prefixToAdd = "";
      context.suffixToAdd = "";
    }

    function addIndexPrefixSuffixToContext(context) {
      context.prefixToAdd = "";
      context.suffixToAdd = "";
    }

    function addEndpointPrefixSuffixToContext(context) {
      context.prefixToAdd = "";
      context.suffixToAdd = "";
    }

    function addMethodAutoCompleteSetToContext(context) {
      context.autoCompleteSet = { templateByTerm: {}, completionTerms: [ "GET", "PUT", "POST", "DELETE", "HEAD" ]}
    }

    function addEndpointAutoCompleteSetToContext(context) {
      var completionTerms = [];
      var methodAndIndices = getCurrentMethodEndpointAndTokenPath();
      completionTerms.push.apply(completionTerms, kb.getEndpointAutocomplete(methodAndIndices.indices,
        methodAndIndices.types, methodAndIndices.id));

      if (methodAndIndices.endpoint) {
        // we already have a part, zoom in
        var filter = termToFilterRegex(methodAndIndices.endpoint + "/", "^");
        completionTerms = $.map(completionTerms, function (term) {
          if ((term + "").match(filter)) return term.substring(methodAndIndices.endpoint.length + 1);
        });
      }

      context.autoCompleteSet = { completionTerms: completionTerms}
    }


    function addTypeAutoCompleteSetToContext(context) {
      var iterToken = editor.iterForCurrentLoc();
      var addEndpoints = false;
      var t = iterToken.getCurrentToken();
      if (t && (t.type == "whitespace" || t.type == "url.slash")) {
        addEndpoints = true;
      }
      else {
        t = iterToken.stepBackward();
        if (t && (t.type == "whitespace" || t.type == "url.slash")) {
          addEndpoints = true;
        }
      }
      var methodAndIndices = getCurrentMethodEndpointAndTokenPath();
      var completionTerms = mappings.getTypes(methodAndIndices.indices) || [];
      if (addEndpoints) {
        completionTerms.push.apply(completionTerms, kb.getEndpointAutocomplete(methodAndIndices.indices,
          methodAndIndices.types, methodAndIndices.id));
      }

      context.autoCompleteSet = { templateByTerm: {}, completionTerms: completionTerms}
    }

    function addIndexAutoCompleteSetToContext(context) {
      var iterToken = editor.iterForCurrentLoc();
      var addEndpoints = false;
      var t = iterToken.getCurrentToken();
      if (t && (t.type == "whitespace" || t.type == "url.slash")) {
        addEndpoints = true;
      }
      else {
        t = iterToken.stepBackward();
        if (t && (t.type == "whitespace" || t.type == "url.slash")) {
          addEndpoints = true;
        }
      }
      var completionTerms = mappings.getIndices(true) || [];
      if (addEndpoints) {
        var methodAndIndices = getCurrentMethodEndpointAndTokenPath();
        completionTerms.push.apply(completionTerms, kb.getEndpointAutocomplete(methodAndIndices.indices,
          methodAndIndices.types, methodAndIndices.id));
      }

      context.autoCompleteSet = { templateByTerm: {}, completionTerms: completionTerms}
    }

    function addBodyAutoCompleteSetToContext(context) {
      var autocompleteSet = { templateByTerm: {}, completionTerms: [] };

      function RuleWalker(initialRules, scopeRules) {
        // scopeRules are the rules used to resolve relative scope links
        if (typeof scopeRules == "undefined") scopeRules = initialRules;
        var WALKER_MODE_EXPECTS_KEY = 1, WALKER_MODE_EXPECTS_CONTAINER = 2, WALKER_MODE_DONE = 3;

        function getRulesType(rules) {
          if (rules == null || typeof rules == undefined) return "null";
          if (rules.__any_of || rules instanceof Array) return "list";
          if (rules.__one_of) return getRulesType(rules.__one_of[0]);
          if (typeof rules == "object") return "object";
          return "value";
        }

        var walker = {
          _rules: initialRules,
          _mode: WALKER_MODE_EXPECTS_CONTAINER,

          walkByToken: function (token) {
            var new_rules;
            if (this._mode == WALKER_MODE_EXPECTS_KEY) {
              if (token == "{" || token == "[") {
                this._rules = null;
                this._mode = WALKER_MODE_DONE;
                return null;
              }
              new_rules = this._rules[token] || this._rules["*"]
                || this._rules["$FIELD$"] || this._rules["$TYPE$"]; // we accept anything for a field.
              if (new_rules && new_rules.__scope_link) {
                new_rules = getLinkedRules(new_rules.__scope_link, scopeRules);
              }

              switch (getRulesType(new_rules)) {
                case "object":
                case "list":
                  this._mode = WALKER_MODE_EXPECTS_CONTAINER;
                  break;
                default:
                  this._mode = WALKER_MODE_DONE;
              }

              this._rules = new_rules;
              return new_rules;
            } else if (this._mode == WALKER_MODE_EXPECTS_CONTAINER) {
              var rulesType = getRulesType(this._rules);

              if (token == "{") {
                if (rulesType != "object") {
                  this._mode = WALKER_MODE_DONE;
                  return this._rules = null;
                }
                this._mode = WALKER_MODE_EXPECTS_KEY;
                return this._rules;
              } else if (token == "[") {
                if (this._rules.__any_of) {
                  new_rules = this._rules.__any_of;
                } else if (this._rules instanceof Array) {
                  new_rules = this._rules;
                } else {
                  this._mode = WALKER_MODE_DONE;
                  return this._rules = null;
                }

                // for now we resolve using the first element in the array
                if (new_rules.length == 0) {
                  this._mode = WALKER_MODE_DONE;
                  return this._rules = null;
                } else {
                  if (new_rules[0] && new_rules[0].__scope_link) {
                    new_rules = [ getLinkedRules(new_rules[0].__scope_link, scopeRules) ];
                  }
                  switch (getRulesType(new_rules[0])) {
                    case "object":
                      this._mode = WALKER_MODE_EXPECTS_CONTAINER;
                      new_rules = new_rules[0];
                      break;
                    case "list":
                      this._mode = WALKER_MODE_EXPECTS_CONTAINER;
                      new_rules = new_rules[0];
                      break;
                    default:
                      this._mode = WALKER_MODE_EXPECTS_KEY;
                  }
                }
                this._rules = new_rules;
                return this._rules;
              }
              else {
                this._rules = null;
                this._mode = WALKER_MODE_DONE;
                return null;
              }
            }
            else {
              this._rules = null;
              this._mode = WALKER_MODE_DONE;
              return null;
            }
          },

          walkTokenPath: function (tokenPath) {
            if (tokenPath.length == 0) return;
            tokenPath = $.merge([], tokenPath);
            var t;
            do {
              t = tokenPath.shift();
            }
            while (this._rules && this.walkByToken(t) != null && tokenPath.length);
          },

          getRules: function () {
            return this._rules;
          },
          getNormalizedRules: function () {
            var rulesType = getRulesType(this._rules);
            if (this._mode == WALKER_MODE_EXPECTS_CONTAINER) {
              switch (rulesType) {
                case "object":
                  return [ "{" ];
                case "list":
                  return [ "[" ];
              }
            }
            return this._rules;
          }
        };
        return walker;
      }

      function getLinkedRules(link, currentRules) {
        var link_path = link.split(".");
        var scheme_id = link_path.shift();
        var linked_rules = currentRules;
        if (scheme_id == "GLOBAL") {
          linked_rules = kb.getGlobalAutocompleteRules();
        }
        else if (scheme_id) {
          linked_rules = kb.getEndpointDescriptionByEndpoint(scheme_id);
          if (!linked_rules)
            throw "Failed to resolve linked scheme: " + scheme_id;
          linked_rules = linked_rules.data_autocomplete_rules;
          if (!linked_rules)
            throw "No autocomplete rules defined in linked scheme: " + scheme_id;

        }

        var walker = new RuleWalker(linked_rules);
        var normalized_path = $.map(link_path, function (t) {
          return [ "{", t];
        }); // inject { before every step
        walker.walkTokenPath(normalized_path);
        var rules = walker.getRules();
        if (!rules) throw "Failed to resolve rules by link: " + link;
        return rules;
      }

      function getRulesForPath(rules, tokenPath, scopeRules) {
        // scopeRules are the rules used to resolve relative scope links
        var walker = new RuleWalker(rules, scopeRules);
        walker.walkTokenPath(tokenPath);
        return walker.getNormalizedRules();


        tokenPath = $.merge([], tokenPath);
        if (!rules)
          return null;

        if (typeof scopeRules == "undefined") scopeRules = rules;
        var t;
        // find the right rule set for current path
        while (tokenPath.length && rules) {
          t = tokenPath.shift();
          switch (t) {
            case "{":
              if (typeof rules != "object") rules = null;
              break;
            case "[":
              if (rules.__any_of || rules instanceof Array) {
                var norm_rules = rules.__any_of || rules;
                if (tokenPath.length) {
                  // we need to go on, try
                  for (var i = 0; i < norm_rules.length; i++) {
                    var possible_rules = getRulesForPath(norm_rules[i], tokenPath, scopeRules);
                    if (possible_rules) return possible_rules;
                  }
                }
                else
                  rules = norm_rules;
              }
              else
                rules = null;
              break;
            default:
              rules = rules[t] || rules["*"] || rules["$FIELD$"] || rules["$TYPE$"]; // we accept anything for a field.
          }
          if (rules && typeof rules.__scope_link != "undefined") {
            rules = getLinkedRules(rules.__scope_link, scopeRules);
          }
        }
        if (tokenPath.length) return null; // didn't find anything.
        return rules;
      }

      function expandTerm(term, activeScheme) {
        if (term == "$INDEX$") {
          return mappings.getIndices();
        }
        else if (term == "$TYPE$") {
          return mappings.getTypes(activeScheme.indices);
        }
        else if (term == "$FIELD$") {
          return mappings.getFields(activeScheme.indices, activeScheme.types);
        }
        return [ term ]
      }

      function extractOptionsForPath(rules, tokenPath, activeScheme) {
        // extracts the relevant parts of rules for tokenPath
        var initialRules = rules;
        rules = getRulesForPath(rules, tokenPath);

        // apply rule set
        var term;
        if (rules) {
          if (typeof rules == "string") {
            $.merge(autocompleteSet.completionTerms, expandTerm(rules, activeScheme));
          }
          else if (rules instanceof Array) {
            if (rules.length > 0 && typeof rules[0] != "object") {// not an array of objects
              $.map(rules, function (t) {
                $.merge(autocompleteSet.completionTerms, expandTerm(t, activeScheme));
              });
            }
          }
          else if (rules.__one_of) {
            if (rules.__one_of.length > 0 && typeof rules.__one_of[0] != "object")
              $.merge(autocompleteSet.completionTerms, rules.__one_of);
          }
          else if (rules.__any_of) {
            if (rules.__any_of.length > 0 && typeof rules.__any_of[0] != "object")
              $.merge(autocompleteSet.completionTerms, rules.__any_of);
          }
          else if (typeof rules == "object") {
            for (term in rules) {

              if (typeof term == "string" && term.match(/^__|^\*$/))
                continue; // meta term

              switch (term) {
                case "$INDEX$":
                  if (activeScheme.indices)
                    $.merge(autocompleteSet.completionTerms, activeScheme.indices);
                  break;
                case "$TYPE$":
                  $.merge(autocompleteSet.completionTerms,
                    mappings.getTypes(activeScheme.indices));
                  break;
                case "$FIELD$":
                  $.merge(autocompleteSet.completionTerms,
                    mappings.getFields(activeScheme.indices, activeScheme.types));
                  break;
                default:
                  autocompleteSet.completionTerms.push(term);
                  break;
              }

              var rules_for_term = rules[term];

              // following linked scope until we find the right template
              while (typeof rules_for_term.__template == "undefined" &&
                typeof rules_for_term.__scope_link != "undefined"
                ) {
                rules_for_term = getLinkedRules(rules_for_term.__scope_link, initialRules);
              }

              if (typeof rules_for_term.__template != "undefined")
                autocompleteSet.templateByTerm[term] = rules_for_term.__template;
              else if (rules_for_term instanceof Array) {
                var template = [];
                if (rules_for_term.length) {
                  if (rules_for_term[0] instanceof  Array) {
                    template = [
                      []
                    ];
                  }
                  else if (typeof rules_for_term[0] == "object") {
                    template = [
                      {}
                    ];
                  }
                  else {
                    template = [rules_for_term[0]];
                  }
                }

                autocompleteSet.templateByTerm[term] = template;
              }
              else if (typeof rules_for_term == "object") {
                if (rules_for_term.__one_of)
                  autocompleteSet.templateByTerm[term] = rules_for_term.__one_of[0];
                else if ($.isEmptyObject(rules_for_term))
                // term sub rules object. Check if has actual or just meta stuff (like __one_of
                  autocompleteSet.templateByTerm[term] = {};
                else {
                  for (var sub_rule in rules_for_term) {
                    if (!(typeof sub_rule == "string" && sub_rule.substring(0, 2) == "__")) {
                      // found a real sub element, it's an object.
                      autocompleteSet.templateByTerm[term] = {};
                      break;
                    }
                  }
                }
              }
              else {
                // just add what ever the value is -> default
                autocompleteSet.templateByTerm[term] = rules_for_term;
              }
            }
          }
          else autocompleteSet.completionTerms.push(rules);
        }

        return rules ? true : false;
      }

      var ret = getCurrentMethodEndpointAndTokenPath();
      context.method = ret.method;
      context.endpoint = ret.endpoint;
      context.urlPath = ret.urlPath;
      context.activeScheme = {
        indices: ret.indices,
        types: ret.types,
        id: ret.id,
        scheme: kb.getEndpointDescriptionByPath(ret.endpoint, ret.indices, ret.types, ret.id)
      };
      var tokenPath = ret.tokenPath;
      if (!tokenPath) { // zero length tokenPath is true

        console.log("Can't extract a valid token path.");
        return context;
      }


      // apply global rules first, as they are of lower priority.
      // start with one before end as to not to resolve just "{" -> empty path
      for (var i = ret.tokenPath.length - 2; i >= 0; i--) {
        var subPath = tokenPath.slice(i);
        if (extractOptionsForPath(kb.getGlobalAutocompleteRules(), subPath, context.activeScheme)) break;
      }
      var pathAsString = tokenPath.join(",");
      extractOptionsForPath((context.activeScheme.scheme || {}).data_autocomplete_rules, tokenPath, context.activeScheme);

      if (autocompleteSet.completionTerms) {
        $.unique(autocompleteSet.completionTerms);
        autocompleteSet.completionTerms.sort();

      }


      console.log("Resolved token path " + pathAsString + " to " + autocompleteSet.completionTerms +
        " (endpoint: " + context.endpoint + " scheme: " + (context.activeScheme.scheme || {})._id + " )"
      );
      context.autoCompleteSet = autocompleteSet.completionTerms ? autocompleteSet : null;
      return context;
    }

    function getCurrentMethodEndpointAndTokenPath() {
      var tokenIter = editor.iterForCurrentLoc();
      var startPos = editor.getCursorPosition();
      var tokenPath = [], last_var = "", first_scope = true;

      var STATES = { looking_for_key: 0, // looking for a key but without jumping over anything but white space and colon.
        looking_for_scope_start: 1, // skip everything until scope start
        start: 3};
      var state = STATES.start;

      // initialization problems -
      var t = tokenIter.getCurrentToken();
      if (t) {
        if (startPos.column == 0) {
          // if we are at the beginning of the line, the current token is the one after cursor, not before which
          // deviates from the standard.
          t = tokenIter.stepBackward();
          state = STATES.looking_for_scope_start;
        }

      }
      else {
        if (startPos.column == 0) {
          // empty lines do no have tokens, move one back
          t = tokenIter.stepBackward();
          state = STATES.start;
        }

      }

      var walkedSomeBody = false;

      // climb one scope at a time and get the scope key
      for (; t && t.type.indexOf("url") == -1 && t.type != "method"; t = tokenIter.stepBackward()) {

        if (t.type != "whitespace") walkedSomeBody = true; // marks we saw something

        switch (t.type) {
          case "variable":
            if (state == STATES.looking_for_key)
              tokenPath.unshift(t.value.trim().replace(/"/g, ''));
            state = STATES.looking_for_scope_start; // skip everything until the beginning of this scope
            break;


          case "paren.lparen":
            tokenPath.unshift(t.value);
            if (state == STATES.looking_for_scope_start) {
              // found it. go look for the relevant key
              state = STATES.looking_for_key;
            }
            break;
          case "paren.rparen":
            // reset he search for key
            state = STATES.looking_for_scope_start;
            // and ignore this sub scope..
            var parenCount = 1;
            t = tokenIter.stepBackward();
            while (t && parenCount > 0) {
              switch (t.type) {
                case "paren.lparen":
                  parenCount--;
                  break;
                case "paren.rparen":
                  parenCount++;
                  break;
              }
              if (parenCount > 0) t = tokenIter.stepBackward();
            }
            if (!t) // oops we run out.. we don't know what's up return null;
              return {};
            continue;
          case "string":
          case "constant.numeric" :
          case "text":
            if (state == STATES.start) {
              state = STATES.looking_for_key;
            }
            else if (state == STATES.looking_for_key) {
              state = STATES.looking_for_scope_start;
            }

            break;
          case "punctuation.comma":
            if (state == STATES.start) {
              state = STATES.looking_for_scope_start;
            }
            break;
          case "punctuation.colon":
          case "whitespace":
            if (state == STATES.start) {
              state = STATES.looking_for_key;
            }
            break; // skip white space

        }
      }

      if (walkedSomeBody && (!tokenPath || tokenPath.length == 0)) {
        // we had some content and still no path -> the cursor is position after a closed body -> no auto complete
        return {};
      }
      if (tokenIter.getCurrentTokenRow() == startPos.row) {
        // we are on the same line as cursor and dealing with url on. Current token is not part of the context
        t = tokenIter.stepBackward();
      }

      var ret = {
        tokenPath: tokenPath,
        endpoint: null,
        urlPath: "",
        indices: [],
        types: [],
        id: null
      };
      while (t && t.type.indexOf("url") != -1) {
        switch (t.type) {
          case "url.index":
            ret.indices.push(t.value);
            ret.urlPath = t.value + ret.urlPath;
            break;
          case "url.type":
            ret.types.push(t.value);
            ret.urlPath = t.value + ret.urlPath;
            break;
          case "url.endpoint":
          case "url.part":
            if (ret.endpoint)
              ret.endpoint = "/" + ret.endpoint;
            else
              ret.endpoint = "";

            ret.endpoint = t.value + ret.endpoint;
            ret.urlPath = t.value + ret.urlPath;
            break;
          case "url.id":
            ret.id = t.value;
            ret.urlPath = t.value + ret.urlPath;
            break;
          case "url.host":
          case "url.scheme":
            break; // ignore
          default:
            ret.urlPath = t.value + ret.urlPath;
            break;
        }
        t = editor.parser.prevNonEmptyToken(tokenIter);
      }

      if (t && t.type == "method") {
        ret.method = t.value;
      }


      return ret;
    }

    function checkCurrentTokenLocIsSameAsActiveContext(currentToken, cursorPos) {
      if (!currentToken || !currentToken.type || editor.parser.isEmptyToken(currentToken)) {
        // check whether the cursor position is the same as the previous token start -> it may have been deleted.
        return cursorPos.row == ACTIVE_CONTEXT.updatedForToken.row &&
          cursorPos.column == ACTIVE_CONTEXT.updatedForToken.start
      }

      return cursorPos.row == ACTIVE_CONTEXT.updatedForToken.row &&
        currentToken.start == ACTIVE_CONTEXT.updatedForToken.start
    }

    function evaluateCurrentTokenAfterAChange() {
      var pos = editor.getCursorPosition();
      var session = editor.getSession();
      var currentToken = session.getTokenAt(pos.row, pos.column);
      console.log("Evaluating current token: " + (currentToken || {}).value +
        " last examined: " + ((ACTIVE_CONTEXT || {}).updatedForToken || {}).value);

      if (!currentToken) {
        if (pos.row == 0) {
          hideAutoComplete();
          LAST_EVALUATED_TOKEN = null;
          ACTIVE_CONTEXT = null;
          return;
        }
        currentToken = { start: 0}; // empty row
      }

      currentToken.row = pos.row; // extend token with row. Ace doesn't supply it by default

      if (ACTIVE_CONTEXT != null && checkCurrentTokenLocIsSameAsActiveContext(currentToken, pos)) {

        if (MODE == MODE_FORCED_CLOSE) {
          // menu was explicitly closed with esc. ignore
          return;
        }


        if (ACTIVE_CONTEXT.updatedForToken.value == currentToken.value)
          return; // nothing changed

        if (MODE == MODE_VISIBLE) updateAutoComplete(); else showAutoComplete();
        return;
      }

      // don't automatically open the auto complete if some just hit enter (new line) or open a parentheses
      if (!currentToken.type || editor.parser.isEmptyToken(currentToken)) return;
      switch (currentToken.type) {
        case "paren.lparen":
        case "paren.rparen":
        case "punctuation.colon":
        case "punctuation.comma":
          return;
      }

      // show menu (if we have something)
      showAutoComplete();
    }

    // initialize endpoint auto complete
    ACTIVE_MENU = $("#autocomplete");
    ACTIVE_MENU.menu({
      select: function (event, ui) {
        applyTerm(ACTIVE_CONTEXT.autoCompleteSet.completionTerms[ui.item.data("term_id")]);
      }
    });

    ACTIVE_MENU.keydown(function (event) {
      console.log("got: " + event.which);
      switch (event.which) {
        case $.ui.keyCode.ESCAPE:
          hideAutoComplete();
          editor.focus();
          break;
        case $.ui.keyCode.TAB:
          ACTIVE_MENU.menu("select"); // select current item.
          return false;
      }
      return true;
    });

    editor.getSession().selection.on('changeCursor', function (event) {
      console.log("updateCursor communicated by editor");
      if (MODE != MODE_VISIBLE) return;
      setTimeout(function () {
        if (MODE != MODE_VISIBLE) return;
        var pos = editor.getCursorPosition();
        if (ACTIVE_CONTEXT.updatedForToken.row != pos.row) {
          hideAutoComplete(); // we moved away
          return;
        }
        var session = editor.getSession();
        var currentToken = session.getTokenAt(pos.row, pos.column);
        if (!checkCurrentTokenLocIsSameAsActiveContext(currentToken, pos)) {
          hideAutoComplete(); // we moved away
        }
      }, 100);

    });

    editor.getSession().on("change", function (e) {
      console.log("Document change communicated by editor");
      if (MODE == MODE_APPLYING_TERM) {
        console.log("Ignoring, triggered by our change");
        return;
      }
      setTimeout(evaluateCurrentTokenAfterAChange, 100)
    });

    return {
      show: function editorAutocompleteCommand() {
        return showAutoComplete(true);
      },
      _test: {
        getAutoCompleteValueFromToken: getAutoCompleteValueFromToken,
        getAutoCompleteContext: getAutoCompleteContext
      }
    }
  }

  return Autocomplete;
});
