/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Observable } from 'rxjs';

import { monaco } from './monaco_imports';

export interface LangModuleType {
  ID: string;
  lexerRules: monaco.languages.IMonarchLanguage;
  languageConfiguration?: monaco.languages.LanguageConfiguration;
  getSuggestionProvider?: Function;
  getSyntaxErrors?: Function;
}

export interface CompleteLangModuleType extends LangModuleType {
  languageConfiguration: monaco.languages.LanguageConfiguration;
  getSuggestionProvider: Function;
  getSyntaxErrors: Function;
  validation$: () => Observable<LangValidation>;
}

export interface EditorError {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
}

export interface LangValidation {
  isValidating: boolean;
  isValid: boolean;
  errors: EditorError[];
}

export interface SyntaxErrors {
  [modelId: string]: EditorError[];
}
