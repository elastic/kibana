/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { monaco } from '@kbn/monaco';
import { Props as CodeEditorProps } from '../code_editor/code_editor';
import { CodeEditor } from '../code_editor';
import { LANG } from './constants';
import { language, conf } from './language';

import './styles.scss';

monaco.languages.register({
  id: LANG,
});
monaco.languages.setMonarchTokensProvider(LANG, language);
monaco.languages.setLanguageConfiguration(LANG, conf);

export interface UrlTemplateEditorVariable {
  label: string;
  title?: string;
  documentation?: string;
  kind?: monaco.languages.CompletionItemKind;
  sortText?: string;
}
export interface UrlTemplateEditorProps {
  value: string;
  height?: CodeEditorProps['height'];
  variables?: UrlTemplateEditorVariable[];
  onChange: CodeEditorProps['onChange'];
  onEditor?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  Editor?: React.ComponentType<CodeEditorProps>;
}

export const UrlTemplateEditor: React.FC<UrlTemplateEditorProps> = ({
  height = 105,
  value,
  variables,
  onChange,
  onEditor,
  Editor = CodeEditor,
}) => {
  const refEditor = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const handleEditor = React.useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    refEditor.current = editor;

    if (onEditor) {
      onEditor(editor);
    }
  }, []);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    const editor = refEditor.current;
    if (!editor) return;

    if (event.key === 'Escape') {
      if (editor.hasWidgetFocus()) {
        // Don't propagate Escape click if Monaco editor is focused, this allows
        // user to close the autocomplete widget with Escape button without
        // closing the EUI flyout.
        event.stopPropagation();
        editor.trigger('editor', 'hideSuggestWidget', []);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!variables) {
      return;
    }

    const { dispose } = monaco.languages.registerCompletionItemProvider(LANG, {
      triggerCharacters: ['{', '/', '?', '&', '='],
      provideCompletionItems(model, position, context, token) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: variables.map(
            ({
              label,
              title = '',
              documentation = '',
              kind = monaco.languages.CompletionItemKind.Variable,
              sortText,
            }) => ({
              kind,
              label,
              insertText: '{{' + label + '}}',
              detail: title,
              documentation,
              range,
              sortText,
            })
          ),
        };
      },
    });

    return () => {
      dispose();
    };
  }, [variables]);

  return (
    <div className={'urlTemplateEditor__container'} onKeyDown={handleKeyDown}>
      <Editor
        languageId={LANG}
        height={height}
        value={value}
        onChange={onChange}
        editorDidMount={handleEditor}
        options={{
          fontSize: 14,
          highlightActiveIndentGuide: false,
          renderLineHighlight: 'none',
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 2,
          quickSuggestions: {
            comments: true,
            strings: true,
            other: true,
          },
          suggestOnTriggerCharacters: true,
          minimap: {
            enabled: false,
          },
          wordWrap: 'on',
          wrappingIndent: 'none',
        }}
      />
    </div>
  );
};
