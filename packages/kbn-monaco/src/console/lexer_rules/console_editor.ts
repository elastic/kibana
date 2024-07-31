/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  consoleSharedLanguageConfiguration,
  consoleSharedLexerRules,
  matchTokensWithEOL,
  matchToken,
  matchTokens,
} from './shared';
import { monaco } from '../../monaco_imports';

export const languageConfiguration: monaco.languages.LanguageConfiguration = {
  ...consoleSharedLanguageConfiguration,
};

export const lexerRules: monaco.languages.IMonarchLanguage = {
  ...consoleSharedLexerRules,
  ignoreCase: true,
  tokenizer: {
    ...consoleSharedLexerRules.tokenizer,
    root: [
      ...consoleSharedLexerRules.tokenizer.root,
      // method
      matchTokensWithEOL('method', /get|post|put|patch|delete|head/, 'root', 'method_sep'),
      // whitespace
      matchToken('whitespace', '\\s+'),
      // text
      matchToken('text', '.+?'),
    ],
    comments: [
      // line comment indicated by #
      matchTokens(['comment.punctuation', 'comment.line'], /(#)(.*$)/),
      ...consoleSharedLexerRules.tokenizer.comments,
    ],
    method_sep: [
      // protocol host with slash
      matchTokensWithEOL(
        ['whitespace', 'url.protocol_host', 'url.slash'],
        /(\s+)(https?:\/\/[^?\/,]+)(\/)/,
        'root',
        'url'
      ),
      // variable template
      matchTokensWithEOL(['whitespace', 'variable.template'], /(\s+)(\${\w+})/, 'root', 'url'),
      // protocol host
      matchTokensWithEOL(
        ['whitespace', 'url.protocol_host'],
        /(\s+)(https?:\/\/[^?\/,]+)/,
        'root',
        'url'
      ),
      // slash
      matchTokensWithEOL(['whitespace', 'url.slash'], /(\s+)(\/)/, 'root', 'url'),
      // whitespace
      matchTokensWithEOL('whitespace', /(\s+)/, 'root', 'url'),
    ],
    url: [
      // variable template
      matchTokensWithEOL('variable.template', /(\${\w+})/, 'root'),
      // pathname
      matchTokensWithEOL('url.part', /([^?\/,\s]+)\s*/, 'root'),
      // comma
      matchTokensWithEOL('url.comma', /(,)/, 'root'),
      // slash
      matchTokensWithEOL('url.slash', /(\/)/, 'root'),
      // question mark
      matchTokensWithEOL('url.questionmark', /(\?)/, 'root', 'urlParams'),
      // comment
      matchTokensWithEOL(
        ['whitespace', 'comment.punctuation', 'comment.line'],
        /(\s+)(\/\/)(.*$)/,
        'root'
      ),
    ],
    urlParams: [
      // param with variable template
      matchTokensWithEOL(
        ['url.param', 'url.equal', 'variable.template'],
        /([^&=]+)(=)(\${\w+})/,
        'root'
      ),
      // param with value
      matchTokensWithEOL(['url.param', 'url.equal', 'url.value'], /([^&=]+)(=)([^&]*)/, 'root'),
      // param
      matchTokensWithEOL('url.param', /([^&=]+)/, 'root'),
      // ampersand
      matchTokensWithEOL('url.amp', /(&)/, 'root'),
      // comment
      matchTokensWithEOL(
        ['whitespace', 'comment.punctuation', 'comment.line'],
        /(\s+)(\/\/)(.*$)/,
        'root'
      ),
    ],
  },
};
