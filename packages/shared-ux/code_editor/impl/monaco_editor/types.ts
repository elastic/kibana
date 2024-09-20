/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco as monacoEditor } from '@kbn/monaco';

/**
 * @remarks
 * This will be `IStandaloneEditorConstructionOptions` in newer versions of monaco-editor, or
 * `IEditorConstructionOptions` in versions before that was introduced.
 */
export type EditorConstructionOptions = NonNullable<
  Parameters<typeof monacoEditor.editor.create>[1]
>;

export type EditorWillMount = (monaco: typeof monacoEditor) => void | EditorConstructionOptions;

export type EditorDidMount = (
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  monaco: typeof monacoEditor
) => void;

export type EditorWillUnmount = (
  editor: monacoEditor.editor.IStandaloneCodeEditor,
  monaco: typeof monacoEditor
) => void | EditorConstructionOptions;

export type ChangeHandler = (
  value: string,
  event: monacoEditor.editor.IModelContentChangedEvent
) => void;

export interface MonacoEditorBaseProps {
  /**
   * Width of editor. Defaults to 100%.
   */
  width?: string | number;

  /**
   * Height of editor. Defaults to 100%.
   */
  height?: string | number;

  /**
   * The initial value of the auto created model in the editor.
   */
  defaultValue?: string;

  /**
   * The initial language of the auto created model in the editor. Defaults to 'javascript'.
   */
  language?: string;

  /**
   * Theme to be used for rendering.
   * The current out-of-the-box available themes are: 'vs' (default), 'vs-dark', 'hc-black'.
   * You can create custom themes via `monaco.editor.defineTheme`.
   */
  theme?: string | null;

  /**
   * Optional string classname to append to the editor.
   */
  className?: string | null;
}

export interface MonacoEditorProps extends MonacoEditorBaseProps {
  /**
   * Value of the auto created model in the editor.
   * If you specify `null` or `undefined` for this property, the component behaves in uncontrolled mode.
   * Otherwise, it behaves in controlled mode.
   */
  value?: string | null;

  /**
   * Refer to Monaco interface {monaco.editor.IStandaloneEditorConstructionOptions}.
   */
  options?: monacoEditor.editor.IStandaloneEditorConstructionOptions;

  /**
   * Refer to Monaco interface {monaco.editor.IEditorOverrideServices}.
   */
  overrideServices?: monacoEditor.editor.IEditorOverrideServices;

  /**
   * An event emitted before the editor mounted (similar to componentWillMount of React).
   */
  editorWillMount?: EditorWillMount;

  /**
   * An event emitted when the editor has been mounted (similar to componentDidMount of React).
   */
  editorDidMount?: EditorDidMount;

  /**
   * An event emitted before the editor unmount (similar to componentWillUnmount of React).
   */
  editorWillUnmount?: EditorWillUnmount;

  /**
   * An event emitted when the content of the current model has changed.
   */
  onChange?: ChangeHandler;

  /**
   * Let the language be inferred from the uri
   */
  uri?: (monaco: typeof monacoEditor) => monacoEditor.Uri;
}
