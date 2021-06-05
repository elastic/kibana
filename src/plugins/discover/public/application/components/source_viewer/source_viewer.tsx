/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useEffect, useState } from 'react';
import { monaco } from '@kbn/monaco';
import { EuiLoadingSpinner } from '@elastic/eui';
import { ElasticRequestState, useEsDocSearch } from '../doc/use_es_doc_search';
import { DocProps } from '../doc/doc';
import { JsonCodeEditorCommon } from '../json_code_editor/json_code_editor_common';

interface SourceViewerProps {
  docProps: DocProps;
  hasLineNumbers: boolean;
  width?: number;
}

export const SourceViewer = ({ docProps, width, hasLineNumbers }: SourceViewerProps) => {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();
  const [jsonValue, setJsonValue] = useState<string>('');

  const [reqState, hit] = useEsDocSearch({ ...docProps, requestFieldsFromSource: true });

  useEffect(() => {
    if (reqState === ElasticRequestState.Found) {
      setJsonValue(JSON.stringify(hit?._source, null, 2));
    }
  }, [reqState, hit]);

  // setting editor height based on lines height and count to stretch and fit its content
  useEffect(() => {
    if (!editor) {
      return;
    }
    const editorElement = editor.getDomNode();

    if (!editorElement) {
      return;
    }

    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    const lineCount = editor.getModel()?.getLineCount() || 1;
    const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight;
    editorElement.style.height = `${height}px`;
    editor.layout();
  }, [editor, jsonValue]);

  return reqState === ElasticRequestState.Loading ? (
    <EuiLoadingSpinner size="m" />
  ) : (
    <JsonCodeEditorCommon
      jsonValue={jsonValue}
      width={width}
      hasLineNumbers={hasLineNumbers}
      onEditorDidMount={(editorNode: monaco.editor.IStandaloneCodeEditor) => setEditor(editorNode)}
    />
  );
};
