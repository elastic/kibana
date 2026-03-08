/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { debounce } from 'lodash';
import { EditorContentSpinner } from '../../components/editor_content_spinner';
import { MonacoEditor } from './monaco_editor';
import { useEditorReadContext } from '../../contexts';
import { getAutocompleteInfo } from '../../../services';

interface Props {
  loading: boolean;
  inputEditorValue: string;
  setInputEditorValue: (value: string) => void;
  setFetchingAutocompleteEntities: (value: boolean) => void;
}

// move to shared const
const DEBOUNCE_DELAY = 500;

export const InputPanel = ({
  loading,
  inputEditorValue,
  setInputEditorValue,
  setFetchingAutocompleteEntities,
}: Props) => {
  const { currentTextObject, customParsedRequestsProvider } = useEditorReadContext();

  useEffect(() => {
    const debouncedSetFechingAutocompleteEntities = debounce(
      setFetchingAutocompleteEntities,
      DEBOUNCE_DELAY
    );
    const subscription = getAutocompleteInfo().isLoading$.subscribe(
      debouncedSetFechingAutocompleteEntities
    );

    return () => {
      subscription.unsubscribe();
      debouncedSetFechingAutocompleteEntities.cancel();
    };
  }, [setFetchingAutocompleteEntities]);

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
