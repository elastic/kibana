/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../monaco_imports';
export declare const buildXjsonRules: (root?: string) => {
  [x: string]:
    | (
        | RegExp
        | {
            token: string;
            nextEmbedded: string;
            next: string;
          }
      )[][]
    | (
        | (string | RegExp)[]
        | (
            | (
                | string
                | {
                    token: string;
                    nextEmbedded: string;
                    next: string;
                  }
              )[]
            | RegExp
          )[]
        | (
            | RegExp
            | {
                token: string;
                next: string;
              }
          )[]
        | (
            | RegExp
            | {
                token: string;
              }
          )[]
        | (
            | RegExp
            | {
                token: string;
                bracket: string;
                next: string;
              }
          )[]
      )[];
  my_painless: (
    | RegExp
    | {
        token: string;
        nextEmbedded: string;
        next: string;
      }
  )[][];
  my_sql: (
    | RegExp
    | {
        token: string;
        nextEmbedded: string;
        next: string;
      }
  )[][];
  string: (
    | (string | RegExp)[]
    | (
        | RegExp
        | {
            token: string;
            bracket: string;
            next: string;
          }
      )[]
  )[];
  string_literal: (
    | (
        | RegExp
        | {
            token: string;
            next: string;
          }
      )[]
    | (
        | RegExp
        | {
            token: string;
          }
      )[]
  )[];
};
export declare const lexerRules: monaco.languages.IMonarchLanguage;
export declare const languageConfiguration: monaco.languages.LanguageConfiguration;
