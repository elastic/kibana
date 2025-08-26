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

type ResizeCheckerSetup = {
  containerRef: React.RefObject<HTMLDivElement>;
  setupResizeChecker: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  destroyResizeChecker: () => void;
};

export const Expression = ({
  grokCollection,
  draftGrokExpression,
  onChange,
  height = '100px',
  dataTestSubj,
  onEditorMount,
  onEditorWillUnmount,
  resizeChecker,
}: {
  grokCollection: GrokCollection;
  draftGrokExpression: DraftGrokExpression;
  onChange?: (expression: DraftGrokExpression) => void;
  height?: CodeEditorProps['height'];
  dataTestSubj?: string;
  onEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor, divElement: HTMLDivElement) => void;
  onEditorWillUnmount?: () => void;
  resizeChecker?: ResizeCheckerSetup;
}) => {
  const [suggestionProvider] = useState(() => {
    return grokCollection.getSuggestionProvider();
  });

  const expression = useObservable(draftGrokExpression.getExpression$());

  const grokEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const containerRef = resizeChecker?.containerRef || divRef;

  const onGrokEditorMount: CodeEditorProps['editorDidMount'] = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      grokEditorRef.current = editor;
      if (onEditorMount && divRef.current) {
        onEditorMount(editor, divRef.current);
      }
      if (resizeChecker) {
        resizeChecker.setupResizeChecker(editor);
      }
    },
    [onEditorMount, resizeChecker]
  );

  const onGrokEditorWillUnmount: CodeEditorProps['editorWillUnmount'] = useCallback(() => {
    if (onEditorWillUnmount) {
      onEditorWillUnmount();
    }
    if (resizeChecker) {
      resizeChecker.destroyResizeChecker();
    }
  }, [onEditorWillUnmount, resizeChecker]);

  const onGrokEditorChange: CodeEditorProps['onChange'] = (value) => {
    draftGrokExpression.updateExpression(value);
    onChange?.(draftGrokExpression);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        overflow: 'hidden',
        minWidth: 0,
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
