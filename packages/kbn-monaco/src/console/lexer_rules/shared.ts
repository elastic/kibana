/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../..';
import { globals } from '../../common/lexer_rules';
import { buildXjsonRules } from '../../xjson/lexer_rules/xjson';

export const consoleSharedLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  brackets: [
    ['{', '}'],
    ['[', ']'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
  ],
};

/*
 util function to build the action object
 */
const addNextStateToAction = (tokens: string[], nextState?: string) => {
  return tokens.map((token, index) => {
    // only last action needs to specify the next state
    if (index === tokens.length - 1 && nextState) {
      return { token, next: nextState };
    }
    return token;
  });
};

/*
 if regex is matched, tokenize as "token" and move to the state "nextState" if defined
 */
export const matchToken = (token: string, regex: string | RegExp, nextState?: string) => {
  if (nextState) {
    return { regex, action: { token, next: nextState } };
  }
  return { regex, action: { token } };
};

/*
 if regex is matched, tokenize as "tokens" consecutively and move to the state "nextState"
 regex needs to have the same number of capturing group as the number of tokens
 */
export const matchTokens = (tokens: string[], regex: string | RegExp, nextState?: string) => {
  const action = addNextStateToAction(tokens, nextState);
  return {
    regex,
    action,
  };
};

export const matchTokensWithEOL = (
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

export const xjsonRules = { ...buildXjsonRules('json_root') };
// @ts-expect-error include comments into json
xjsonRules.json_root = [{ include: '@comments' }, ...xjsonRules.json_root];
xjsonRules.json_root = [
  // @ts-expect-error include variables into json
  matchToken('variable.template', /("\${\w+}")/),
  ...xjsonRules.json_root,
];

/*
 Lexer rules that are shared between the Console editor and the Console output panel.
 */
export const consoleSharedLexerRules: monaco.languages.IMonarchLanguage = {
  ...(globals as any),
  defaultToken: 'invalid',
  tokenizer: {
    root: [
      // warning comment
      matchToken('warning', '#!.*$'),
      // comments
      { include: '@comments' },
      // start of json
      matchToken('paren.lparen', '{', 'json_root'),
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
      matchToken('comment.punctuation', /\*\//, '@pop'),
      // match individual chars inside a multi-line comment
      matchToken('comment', /[\/*]/),
    ],
    // include json rules
    ...xjsonRules,
  },
};
