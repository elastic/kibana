/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CodeEditorProps, monaco } from '@kbn/code-editor';
import { CodeEditor } from '@kbn/code-editor';
import React, { useRef, useState, useCallback } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { DraftGrokExpression, GrokCollection } from '../models';

export const Expression = ({
  grokCollection,
  draftGrokExpression,
  onChange,
  height = '100px',
  dataTestSubj,
  onEditorMount,
  onEditorWillUnmount,
}: {
  grokCollection: GrokCollection;
  draftGrokExpression: DraftGrokExpression;
  onChange?: (expression: DraftGrokExpression) => void;
  height?: CodeEditorProps['height'];
  dataTestSubj?: string;
  onEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor, divElement: HTMLDivElement) => void;
  onEditorWillUnmount?: () => void;
}) => {
  const [suggestionProvider] = useState(() => {
    return grokCollection.getSuggestionProvider();
  });

  const expression = useObservable(draftGrokExpression.getExpression$());

  const grokEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);

  const onGrokEditorMount: CodeEditorProps['editorDidMount'] = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    grokEditorRef.current = editor;
    if (onEditorMount && divRef.current) {
      onEditorMount(editor, divRef.current);
    }
  }, [onEditorMount]);

  const onGrokEditorWillUnmount: CodeEditorProps['editorWillUnmount'] = useCallback(() => {
    if (onEditorWillUnmount) {
      onEditorWillUnmount();
    }
  }, [onEditorWillUnmount]);

  const onGrokEditorChange: CodeEditorProps['onChange'] = (value) => {
    draftGrokExpression.updateExpression(value);
    onChange?.(draftGrokExpression);
  };

  return (
    <div
      ref={divRef}
      style={{
        width: '100%',
        height,
        overflow: 'hidden',
      }}
    >
      <CodeEditor
        languageId="grok"
        value={expression ?? ''}
        height={height}
        fullWidth={true}
        editorDidMount={onGrokEditorMount}
        editorWillUnmount={onGrokEditorWillUnmount}
        onChange={onGrokEditorChange}
        suggestionProvider={suggestionProvider}
        dataTestSubj={dataTestSubj}
      />
    </div>
  );
};
