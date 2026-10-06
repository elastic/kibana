/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../..';
export declare const consoleSharedLanguageConfiguration: monaco.languages.LanguageConfiguration;
export declare const matchToken: (
  token: string,
  regex: string | RegExp,
  nextState?: string
) =>
  | {
      regex: string | RegExp;
      action: {
        token: string;
        next: string;
      };
    }
  | {
      regex: string | RegExp;
      action: {
        next?: undefined;
        token: string;
      };
    };
export declare const matchTokens: (
  tokens: string[],
  regex: string | RegExp,
  nextState?: string
) => {
  regex: string | RegExp;
  action: (
    | string
    | {
        token: string;
        next: string;
      }
  )[];
};
export declare const matchTokensWithEOL: (
  tokens: string | string[],
  regex: string | RegExp,
  nextIfEOL: string,
  normalNext?: string
) =>
  | {
      regex: string | RegExp;
      action: {
        cases: {
          '@eos': (
            | string
            | {
                token: string;
                next: string;
              }
          )[];
          '@default': (
            | string
            | {
                token: string;
                next: string;
              }
          )[];
        };
      };
    }
  | {
      regex: string | RegExp;
      action: {
        cases: {
          '@eos': {
            token: string;
            next: string;
          };
          '@default': {
            token: string;
            next: string | undefined;
          };
        };
      };
    };
export declare const consoleSharedLexerRules: monaco.languages.IMonarchLanguage;
