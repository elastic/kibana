/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../../monaco_imports';
export interface Language extends monaco.languages.IMonarchLanguage {
  default: string;
  brackets: monaco.languages.IMonarchLanguage['brackets'];
  keywords: string[];
  symbols: RegExp;
  escapes: RegExp;
  digits: RegExp;
  primitives: string[];
  octaldigits: RegExp;
  binarydigits: RegExp;
  constants: string[];
  operators: string[];
}
export declare const lexerRules: Language;
export declare const languageConfiguration: monaco.languages.LanguageConfiguration;
