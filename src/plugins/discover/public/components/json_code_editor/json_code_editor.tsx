/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './json_code_editor.scss';

import React, { useCallback } from 'react';
import { monaco } from '@kbn/monaco';
import { JsonCodeEditorCommon } from './json_code_editor_common';

interface JsonCodeEditorProps {
  json: Record<string, unknown>;
  width?: string | number;
  hasLineNumbers?: boolean;
}

export const JsonCodeEditor = ({ json, width, hasLineNumbers }: JsonCodeEditorProps) => {
  const jsonValue = JSON.stringify(json, null, 2);

  // setting editor height based on lines height and count to stretch and fit its content
  const setEditorCalculatedHeight = useCallback((editor) => {
    const editorElement = editor.getDomNode();

    if (!editorElement) {
      return;
    }

    const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
    const lineCount = editor.getModel()?.getLineCount() || 1;
    const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight;

    editorElement.style.height = `${height}px`;
    editor.layout();
  }, []);

  return (
    <JsonCodeEditorCommon
      jsonValue={jsonValue}
      width={width}
      hasLineNumbers={hasLineNumbers}
      onEditorDidMount={setEditorCalculatedHeight}
    />
  );
};
