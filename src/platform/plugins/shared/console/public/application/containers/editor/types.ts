/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco, ParsedRequest } from '@kbn/monaco';

export type EditorViewState = ReturnType<monaco.editor.IStandaloneCodeEditor['saveViewState']>;

export interface InputEditorValue {
  text: string;
  viewState?: EditorViewState;
}

export interface PersistedEditorTab {
  id: string;
  label: string;
  inputValue: InputEditorValue;
}

export interface PersistedEditorTabsState {
  selectedTabId: string;
  tabs: PersistedEditorTab[];
}

export interface EditorRequest {
  method: string;
  url: string;
  data: string[];
}

export interface AdjustedParsedRequest extends ParsedRequest {
  startLineNumber: number;
  endLineNumber: number;
}

export interface StatusCodeClassNames {
  monacoStatusCodeLinePrimary: string;
  monacoStatusCodeLineNumberPrimary: string;
  monacoStatusCodeLineSuccess: string;
  monacoStatusCodeLineNumberSuccess: string;
  monacoStatusCodeLineDefault: string;
  monacoStatusCodeLineNumberDefault: string;
  monacoStatusCodeLineWarning: string;
  monacoStatusCodeLineNumberWarning: string;
  monacoStatusCodeLineDanger: string;
  monacoStatusCodeLineNumberDanger: string;
}
