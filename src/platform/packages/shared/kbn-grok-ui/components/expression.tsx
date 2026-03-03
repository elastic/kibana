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
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useResizeChecker } from '@kbn/react-hooks';
import { DraftGrokExpression, type GrokCollection } from '../models';

export const Expression = ({
  grokCollection,
  pattern,
  onChange,
  height = '100px',
  dataTestSubj,
}: {
  grokCollection: GrokCollection;
  pattern: string;
  onChange?: (pattern: string) => void;
  height?: CodeEditorProps['height'];
  dataTestSubj?: string;
}) => {
  const [suggestionProvider] = useState(() => {
    return grokCollection.getSuggestionProvider();
  });

  const draftGrokExpression = useMemo(() => {
    return new DraftGrokExpression(grokCollection, pattern);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grokCollection]);

  // Sync pattern prop with internal DraftGrokExpression
  useEffect(() => {
    const currentExpression = draftGrokExpression.getExpression();
    if (currentExpression !== pattern) {
      draftGrokExpression.updateExpression(pattern);
    }
  }, [pattern, draftGrokExpression]);

  const grokEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { containerRef, setupResizeChecker, destroyResizeChecker } = useResizeChecker();

  const onGrokEditorMount: CodeEditorProps['editorDidMount'] = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    grokEditorRef.current = editor;
    setupResizeChecker(editor);
  };

  const onGrokEditorWillUnmount: CodeEditorProps['editorWillUnmount'] = () => {
    destroyResizeChecker();
  };

  const onGrokEditorChange: CodeEditorProps['onChange'] = (value) => {
    draftGrokExpression.updateExpression(value);
    onChange?.(value);
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
        value={pattern}
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
