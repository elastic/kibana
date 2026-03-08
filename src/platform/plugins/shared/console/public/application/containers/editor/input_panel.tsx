/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EditorContentSpinner } from '../../components/editor_content_spinner';
import { MonacoEditor } from './monaco_editor';
import { useEditorReadContext } from '../../contexts';

interface Props {
  loading: boolean;
  inputEditorValue: string;
  setInputEditorValue: (value: string) => void;
}

export const InputPanel = ({ loading, inputEditorValue, setInputEditorValue }: Props) => {
  const { currentTextObject, customParsedRequestsProvider } = useEditorReadContext();

  if (!currentTextObject) return null;

  return (
    <>
      {' '}
      {loading ? (
        <EditorContentSpinner />
      ) : (
        <MonacoEditor
          localStorageValue={currentTextObject.text}
          value={inputEditorValue}
          setValue={setInputEditorValue}
          customParsedRequestsProvider={customParsedRequestsProvider}
        />
      )}
    </>
  );
};
