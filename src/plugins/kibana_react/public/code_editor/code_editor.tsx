/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactResizeDetector from 'react-resize-detector';
import MonacoEditor, { EditorDidMount, EditorWillMount } from 'react-monaco-editor';

import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/base/common/worker/simpleWorker';
import 'monaco-editor/esm/vs/base/worker/defaultWorkerFactory';

import 'monaco-editor/esm/vs/editor/browser/controller/coreCommands.js';
import 'monaco-editor/esm/vs/editor/browser/widget/codeEditorWidget.js';

import 'monaco-editor/esm/vs/editor/contrib/suggest/suggestController.js'; // Needed for suggestions
import 'monaco-editor/esm/vs/editor/contrib/hover/hover.js'; // Needed for hover
import 'monaco-editor/esm/vs/editor/contrib/parameterHints/parameterHints.js'; // Needed for signature

import { LIGHT_THEME, DARK_THEME } from './editor_theme';

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
  onChange: (value: string) => void;

  /**
   * Options for the Monaco Code Editor
   * Documentation of options can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.ieditorconstructionoptions.html
   */
  options?: monacoEditor.editor.IEditorConstructionOptions;

  /**
   * Suggestion provider for autocompletion
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.completionitemprovider.html
   */
  suggestionProvider?: monacoEditor.languages.CompletionItemProvider;

  /**
   * Signature provider for function parameter info
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.signaturehelpprovider.html
   */
  signatureProvider?: monacoEditor.languages.SignatureHelpProvider;

  /**
   * Hover provider for hover documentation
   * Documentation for the provider can be found here:
   * https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.hoverprovider.html
   */
  hoverProvider?: monacoEditor.languages.HoverProvider;

  /**
   * Function called before the editor is mounted in the view
   */
  editorWillMount?: EditorWillMount;
  /**
   * Function called before the editor is mounted in the view
   * and completely replaces the setup behavior called by the component
   */
  overrideEditorWillMount?: EditorWillMount;

  /**
   * Function called after the editor is mounted in the view
   */
  editorDidMount?: EditorDidMount;

  /**
   * Should the editor use the dark theme
   */
  useDarkTheme?: boolean;
}

export class CodeEditor extends React.Component<Props, {}> {
  _editor: monacoEditor.editor.IStandaloneCodeEditor | null = null;

  _editorWillMount = (monaco: typeof monacoEditor) => {
    if (this.props.overrideEditorWillMount) {
      this.props.overrideEditorWillMount(monaco);
      return;
    }

    if (this.props.editorWillMount) {
      this.props.editorWillMount(monaco);
    }

    monaco.languages.onLanguage(this.props.languageId, () => {
      if (this.props.suggestionProvider) {
        monaco.languages.registerCompletionItemProvider(
          this.props.languageId,
          this.props.suggestionProvider
        );
      }

      if (this.props.signatureProvider) {
        monaco.languages.registerSignatureHelpProvider(
          this.props.languageId,
          this.props.signatureProvider
        );
      }

      if (this.props.hoverProvider) {
        monaco.languages.registerHoverProvider(this.props.languageId, this.props.hoverProvider);
      }
    });

    // Register the theme
    monaco.editor.defineTheme('euiColors', this.props.useDarkTheme ? DARK_THEME : LIGHT_THEME);
  };

  _editorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    monaco: typeof monacoEditor
  ) => {
    this._editor = editor;

    if (this.props.editorDidMount) {
      this.props.editorDidMount(editor, monaco);
    }
  };

  render() {
    const { languageId, value, onChange, width, height, options } = this.props;

    return (
      <React.Fragment>
        <MonacoEditor
          theme="euiColors"
          language={languageId}
          value={value}
          onChange={onChange}
          editorWillMount={this._editorWillMount}
          editorDidMount={this._editorDidMount}
          width={width}
          height={height}
          options={options}
        />
        <ReactResizeDetector handleWidth handleHeight onResize={this._updateDimensions} />
      </React.Fragment>
    );
  }

  _updateDimensions = () => {
    if (this._editor) {
      this._editor.layout();
    }
  };
}
