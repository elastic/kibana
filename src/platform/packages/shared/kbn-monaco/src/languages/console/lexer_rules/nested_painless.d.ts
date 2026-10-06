/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../monaco_imports';
export declare const buildPainlessStartRule: (painlessRoot?: string) => (
  | (
      | string
      | {
          token: string;
          next: string;
        }
    )[]
  | RegExp
)[];
export declare const buildPainlessRules: (
  painlessRoot?: string
) => Record<string, monaco.languages.IMonarchLanguageRule[]>;
export declare const painlessLanguageAttributes: {
  keywords: string[];
  primitives: string[];
  constants: string[];
  operators: string[];
  symbols: RegExp;
  digits: RegExp;
  octaldigits: RegExp;
  binarydigits: RegExp;
  hexdigits: any;
};
