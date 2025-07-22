/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CodeEditor, CodeEditorProps, monaco } from '@kbn/code-editor';
import React, { useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { DraftGrokExpression, GrokCollection } from '../models';

export const Expression = ({
  grokCollection,
  draftGrokExpression,
  onChange,
  height = '100px',
  dataTestSubj,
}: {
  grokCollection: GrokCollection;
  draftGrokExpression: DraftGrokExpression;
  onChange?: (expression: DraftGrokExpression) => void;
  height?: CodeEditorProps['height'];
  dataTestSubj?: string;
}) => {
  const [suggestionProvider] = useState(() => {
    return grokCollection.getSuggestionProvider();
  });

  const expression = useObservable(draftGrokExpression.getExpression$());

  const grokEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const onGrokEditorMount: CodeEditorProps['editorDidMount'] = (editor) => {
    grokEditorRef.current = editor;
  };

  const onGrokEditorChange: CodeEditorProps['onChange'] = (value) => {
    draftGrokExpression.updateExpression(value);
    onChange?.(draftGrokExpression);
  };

  return (
    <CodeEditor
      languageId="grok"
      value={expression ?? ''}
      height={height}
      editorDidMount={onGrokEditorMount}
      onChange={onGrokEditorChange}
      suggestionProvider={suggestionProvider}
      dataTestSubj={dataTestSubj}
    />
  );
};
