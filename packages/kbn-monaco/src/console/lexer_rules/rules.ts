/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../monaco_imports';

export const languageConfiguration: monaco.languages.LanguageConfiguration = {};

const addNextStateToAction = (tokens: string[], nextState?: string) => {
  return tokens.map((token, index) => {
    if (index === tokens.length - 1 && nextState) {
      return { token, next: nextState };
    }
    return token;
  });
};

/*
 if regex is matched, tokenize as "token" and move to the state "nextState" if defined
 */
const matchToken = (token: string, regex: string | RegExp, nextState?: string) => {
  if (nextState) {
    return { regex, action: { token, next: nextState } };
  }
  return { regex, action: { token } };
};

/*
 if regex is matched, tokenize as "tokens" consecutively and move to the state "nextState"
 regex needs to have the same number of capturing group as the number of tokens
 */
const matchTokens = (tokens: string[], regex: string | RegExp, nextState?: string) => {
  // only last action needs to specify the next state
  const action = addNextStateToAction(tokens, nextState);
  return {
    regex,
    action,
  };
};

const addEOL = (
  tokens: string | string[],
  regex: string | RegExp,
  nextIfEOL: string,
  normalNext?: string
) => {
  if (Array.isArray(tokens)) {
    const endOfLineAction = addNextStateToAction(tokens, nextIfEOL);
    const action = addNextStateToAction(tokens, normalNext);
    return {
      regex,
      action: {
        cases: {
          '@eos': endOfLineAction,
          '@default': action,
        },
      },
    };
  }
  return {
    regex,
    action: {
      cases: {
        '@eos': { token: tokens, next: nextIfEOL },
        '@default': { token: tokens, next: normalNext },
      },
    },
  };
};

export const lexerRules: monaco.languages.IMonarchLanguage = {
  defaultToken: 'invalid',
  tokenizer: {
    root: [
      // warning comment
      matchToken('warning', '#!.*$'),
      // comments
      { include: '@comments' },
      // method
      addEOL('method', /([a-zA-Z]+)/, 'root', 'method_sep'),
    ],
    method_sep: [
      // protocol host with slash
      addEOL(
        ['whitespace', 'url.protocol_host', 'url.slash'],
        /(\s+)(https?:\/\/[^?\/,]+)(\/)/,
        'root',
        'url'
      ),
      // variable template
      addEOL(['whitespace', 'variable.template'], /(\s+)(\${\w+})/, 'root', 'url'),
      // protocol host
      addEOL(['whitespace', 'url.protocol_host'], /(\s+)(https?:\/\/[^?\/,]+)/, 'root', 'url'),
      // slash
      addEOL(['whitespace', 'url.slash'], /(\s+)(\/)/, 'root', 'url'),
      // whitespace
      addEOL('whitespace', /(\s+)/, 'root', 'url'),
    ],
    url: [
      // variable template
      addEOL('variable.template', /(\${\w+})/, 'root'),
      // pathname
      addEOL('url.part', /([^?\/,\s]+)\s*/, 'root'),
      // comma
      addEOL('url.comma', /(,)/, 'root'),
      // slash
      addEOL('url.slash', /(\/)/, 'root'),
      // question mark
      addEOL('url.questionmark', /(\?)/, 'root', 'urlParams'),
      // comment
      addEOL(['whitespace', 'comment.punctuation', 'comment.line'], /(\s+)(\/\/)(.*$)/, 'root'),
    ],
    urlParams: [
      // param with variable template
      addEOL(['url.param', 'url.equal', 'variable.template'], /([^&=]+)(=)(\${\w+})/, 'root'),
      // param with value
      addEOL(['url.param', 'url.equal', 'url.value'], /([^&=]+)(=)([^&]*)/, 'root'),
      // param
      addEOL('url.param', /([^&=]+)/, 'root'),
      // ampersand
      addEOL('url.amp', /(&)/, 'root'),
      // comment
      addEOL(['whitespace', 'comment.punctuation', 'comment.line'], /(\s+)(\/\/)(.*$)/, 'root'),
    ],
    comments: [
      // line comment indicated by #
      matchTokens(['comment.punctuation', 'comment.line'], /(#)(.*$)/),
      // start a block comment indicated by /*
      matchToken('comment.punctuation', /\/\*/, 'block_comment'),
      // line comment indicated by //
      matchTokens(['comment.punctuation', 'comment.line'], /(\/\/)(.*$)/),
    ],
    block_comment: [
      // match everything on a single line inside the comment except for chars / and *
      matchToken('comment', /[^\/*]+/),
      // end block comment
      matchToken('comment.punctuation', /\*\//, 'root'),
      // match individual chars inside a multi-line comment
      matchToken('comment', /[\/*]/),
    ],
  },
};
