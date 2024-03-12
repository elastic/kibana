/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../monaco_imports';

export const languageConfiguration: monaco.languages.LanguageConfiguration = {};

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
  const action = tokens.map((token, index) => {
    if (index === tokens.length - 1 && nextState) {
      return { token, next: nextState };
    }
    return token;
  });
  return {
    regex,
    action,
  };
};

/*
 if end of line is matched, tokenize as "whitespace" and move to the state "nextState"
 */
const matchEndOfLine = (nextState: string = 'root') => {
  return matchToken('whitespace', /@regex_end_of_line/, nextState);
};

export const lexerRules: monaco.languages.IMonarchLanguage = {
  defaultToken: 'invalid',
  regex_end_of_line: /(\s*)$/,
  tokenizer: {
    root: [
      // warning comment
      matchToken('warning', '#!.*$'),
      // comments
      { include: '@comments' },
      // method
      matchToken('method', /([a-zA-Z]+)/, 'method_sep'),
    ],
    method_sep: [
      matchEndOfLine(),
      // protocol host with slash
      matchTokens(
        ['whitespace', 'url.protocol_host', 'url.slash'],
        /(\s+)(https?:\/\/[^?\/,]+)(\/)/,
        'url'
      ),
      // variable template
      matchTokens(['whitespace', 'variable.template'], /(\s+)(\${\w+})/, 'url'),
      // protocol host
      matchTokens(['whitespace', 'url.protocol_host'], /(\s+)(https?:\/\/[^?\/,]+)/, 'url'),
      // slash
      matchTokens(['whitespace', 'url.slash'], /(\s+)(\/)/, 'url'),
      // whitespace
      matchToken('whitespace', /(\s+)/, 'url'),
    ],
    url: [
      matchEndOfLine(),
      // variable template
      matchToken('variable.template', /(\${\w+})/),
      // pathname
      matchToken('url.part', /([^?\/,\s]+)/),
      // comma
      matchToken('url.comma', /(,)/),
      // slash
      matchToken('url.slash', /(\/)/),
      // question mark
      matchToken('url.questionmark', /(\?)/, 'urlParams'),
      // comment
      matchTokens(['whitespace', 'comment.punctuation', 'comment.line'], /(\s+)(\/\/)(.*$)/),
    ],
    urlParams: [
      matchEndOfLine(),
      // param with variable template
      matchTokens(['url.param', 'url.equal', 'variable.template'], /([^&=]+)(=)(\${\w+})/),
      // param with value
      matchTokens(['url.param', 'url.equal', 'url.value'], /([^&=]+)(=)([^&]*)/),
      // param
      matchToken('url.param', /([^&=]+)/),
      // ampersand
      matchToken('url.amp', /(&)/),
      // comment
      matchTokens(['whitespace', 'comment.punctuation', 'comment.line'], /(\s+)(\/\/)(.*$)/),
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
