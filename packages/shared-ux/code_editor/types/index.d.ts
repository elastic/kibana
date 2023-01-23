/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { monaco } from '@kbn/monaco';

export interface Props {
  /** Width of editor. Defaults to 100%. */
  width?: string | number;

  /** Height of editor. Defaults to 100%. */
  height?: string | number;

  /** ID of the editor language */
  languageId: string;

  /** Value of the editor */
  value: string;

  /** Function invoked when text in editor is changed */
  onChange?: (value: string, event: monaco.editor.IModelContentChangedEvent) => void;

  /**
   * Options for the Monaco Code Editor
   * Documentation of options can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.istandaloneeditorconstructionoptions.html
   */
  options?: monaco.editor.IStandaloneEditorConstructionOptions;

  /**
   * Suggestion provider for autocompletion
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.completionitemprovider.html
   */
  suggestionProvider?: monaco.languages.CompletionItemProvider;

  /**
   * Signature provider for function parameter info
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.signaturehelpprovider.html
   */
  signatureProvider?: monaco.languages.SignatureHelpProvider;

  /**
   * Hover provider for hover documentation
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.hoverprovider.html
   */
  hoverProvider?: monaco.languages.HoverProvider;

  /**
   * Language config provider for bracket
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.languageconfiguration.html
   */
  languageConfiguration?: monaco.languages.LanguageConfiguration;

  /**
   * Function called before the editor is mounted in the view
   */
  editorWillMount?: () => void;
  /**
   * Function called before the editor is mounted in the view
   * and completely replaces the setup behavior called by the component
   */
  overrideEditorWillMount?: () => void;

  /**
   * Function called after the editor is mounted in the view
   */
  editorDidMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  /**
   * Should the editor use the dark theme
   */
  useDarkTheme?: boolean;

  /**
   * Should the editor use a transparent background
   */
  transparentBackground?: boolean;

  /**
   * Should the editor be rendered using the fullWidth EUI attribute
   */
  fullWidth?: boolean;

  /**
   * Place holder text for the code editor
   */
  placeholder?: string;
  /**
   * Accessible name for the editor. (Defaults to "Code editor")
   */
  'aria-label'?: string;

  isCopyable?: boolean;
  allowFullScreen?: boolean;
}
