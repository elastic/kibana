/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { monaco, XJsonLang } from '@kbn/monaco';
import { CodeEditor, MarkdownLang } from '@kbn/kibana-react-plugin/public';

interface FieldCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  type: 'markdown' | 'json';
  isReadOnly: boolean;
  a11yProps: Record<string, string>;
  name: string;
}

const MIN_DEFAULT_LINES_COUNT = 6;
const MAX_DEFAULT_LINES_COUNT = 30;

export const FieldCodeEditor = ({
  value,
  onChange,
  type,
  isReadOnly,
  a11yProps,
  name,
}: FieldCodeEditorProps) => {
  // setting editor height based on lines height and count to stretch and fit its content
  const setEditorCalculatedHeight = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      const editorElement = editor.getDomNode();

      if (!editorElement) {
        return;
      }

      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
      let lineCount = editor.getModel()?.getLineCount() || MIN_DEFAULT_LINES_COUNT;
      if (lineCount < MIN_DEFAULT_LINES_COUNT) {
        lineCount = MIN_DEFAULT_LINES_COUNT;
      } else if (lineCount > MAX_DEFAULT_LINES_COUNT) {
        lineCount = MAX_DEFAULT_LINES_COUNT;
      }
      const height = lineHeight * lineCount;

      editorElement.id = name;
      editorElement.style.height = `${height}px`;
      editor.layout();
    },
    [name]
  );

  const trimEditorBlankLines = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const editorModel = editor.getModel();

    if (!editorModel) {
      return;
    }
    const trimmedValue = editorModel.getValue().trim();
    editorModel.setValue(trimmedValue);
  }, []);

  const editorDidMount = useCallback(
    (editor) => {
      setEditorCalculatedHeight(editor);

      editor.onDidChangeModelContent(() => {
        setEditorCalculatedHeight(editor);
      });

      editor.onDidBlurEditorWidget(() => {
        trimEditorBlankLines(editor);
      });
    },
    [setEditorCalculatedHeight, trimEditorBlankLines]
  );

  return (
    <CodeEditor
      {...a11yProps}
      languageId={type === 'json' ? XJsonLang.ID : MarkdownLang}
      value={value}
      onChange={onChange}
      editorDidMount={editorDidMount}
      width="100%"
      options={{
        readOnly: isReadOnly,
        lineNumbers: 'off',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        folding: false,
        tabSize: 2,
        scrollbar: {
          alwaysConsumeMouseWheel: false,
        },
        wordWrap: 'on',
        wrappingIndent: 'indent',
      }}
    />
  );
};
