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
  lexerRules?: monaco.languages.IMonarchLanguage;
  languageConfiguration?: monaco.languages.LanguageConfiguration;
  getSuggestionProvider?: Function;
}

export interface CompleteLangModuleType extends LangModuleType {
  languageConfiguration: monaco.languages.LanguageConfiguration;
  getSuggestionProvider: Function;
  getSyntaxErrors: Function;
  validation$: () => Observable<LangValidation>;
}

export interface LanguageProvidersModule<Deps = unknown> {
  validate: (
    model: monaco.editor.ITextModel,
    code: string,
    callbacks?: Deps
  ) => Promise<{ errors: monaco.editor.IMarkerData[]; warnings: monaco.editor.IMarkerData[] }>;
  getSuggestionProvider: (callbacks?: Deps) => monaco.languages.CompletionItemProvider;
  getSignatureProvider?: (callbacks?: Deps) => monaco.languages.SignatureHelpProvider;
  getHoverProvider?: (callbacks?: Deps) => monaco.languages.HoverProvider;
  getCodeActionProvider?: (callbacks?: Deps) => monaco.languages.CodeActionProvider;
}

export interface CustomLangModuleType<Deps = unknown>
  extends Omit<LangModuleType, 'getSuggestionProvider'>,
    LanguageProvidersModule<Deps> {
  onLanguage: () => void;
}

export interface MonacoEditorError {
  severity: monaco.MarkerSeverity;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  code?: string | undefined;
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
