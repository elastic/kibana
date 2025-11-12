/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { UseEuiTheme } from '@elastic/eui';
import type { monaco } from './monaco_imports';

export interface LangModuleType {
  ID: string;
  lexerRules?: monaco.languages.IMonarchLanguage;
  languageConfiguration?: monaco.languages.LanguageConfiguration;
  foldingRangeProvider?: monaco.languages.FoldingRangeProvider;
  getSuggestionProvider?: Function;
  onLanguage?: () => void;
  languageThemeResolver?: (args: UseEuiTheme) => monaco.editor.IStandaloneThemeData;
}

export interface CompleteLangModuleType extends LangModuleType {
  languageConfiguration: monaco.languages.LanguageConfiguration;
  getSuggestionProvider: Function;
  getSyntaxErrors: Function;
  validation$: () => Observable<LangValidation>;
}

interface LanguageProvidersModule<Deps = unknown, MarkerDataType = monaco.editor.IMarkerData> {
  validate: (
    model: monaco.editor.ITextModel,
    code: string,
    callbacks?: Deps
  ) => Promise<{ errors: MarkerDataType[]; warnings: MarkerDataType[] }>;
  getSuggestionProvider: (callbacks?: Deps) => monaco.languages.CompletionItemProvider;
  getSignatureProvider?: (callbacks?: Deps) => monaco.languages.SignatureHelpProvider;
  getHoverProvider?: (callbacks?: Deps) => monaco.languages.HoverProvider;
  getCodeActionProvider?: (callbacks?: Deps) => monaco.languages.CodeActionProvider;
}

export interface CustomLangModuleType<Deps = unknown, MarkerDataType = monaco.editor.IMarkerData>
  extends Omit<LangModuleType, 'getSuggestionProvider' | 'onLanguage'>,
    LanguageProvidersModule<Deps, MarkerDataType> {
  onLanguage: NonNullable<LangModuleType['onLanguage']>;
}

export interface MonacoEditorError {
  severity: monaco.MarkerSeverity;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  code: string;
}

export interface LangValidation {
  isValidating: boolean;
  isValid: boolean;
  errors: MonacoEditorError[];
}

export interface SyntaxErrors {
  [modelId: string]: MonacoEditorError[];
}

export interface BaseWorkerDefinition {
  getSyntaxErrors: (modelUri: string) => Promise<MonacoEditorError[] | undefined>;
}
