/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'init-monaco' {
  import Monaco, { editor } from 'monaco-editor';
  import IEditorContribution = editor.IEditorContribution;
  import ICodeEditor = editor.ICodeEditor;

  export * from 'monaco-editor';
  export type Monaco = typeof Monaco;

  export function initMonaco(callback: (monaco: typeof Monaco) => void): any;
}
