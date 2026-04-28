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
import { DEBOUNCE_DELAY } from '../../const';
import type { InputEditorValue } from './types';

interface Props {
  loading: boolean;
  activeTabId?: string;
  inputEditorValue: InputEditorValue;
  setInputEditorValue: (value: InputEditorValue) => void;
  setFetchingAutocompleteEntities: (value: boolean) => void;
  skipInitialValue?: boolean;
  allowDefaultValueWhenEmpty?: boolean;
}

export const InputPanel = ({
  loading,
  activeTabId,
  inputEditorValue,
  setInputEditorValue,
  setFetchingAutocompleteEntities,
  skipInitialValue,
  allowDefaultValueWhenEmpty,
}: Props) => {
  const { currentTextObject, customParsedRequestsProvider } = useEditorReadContext();

  useEffect(() => {
    const debouncedSetFetchingAutocompleteEntities = debounce(
      setFetchingAutocompleteEntities,
      DEBOUNCE_DELAY
    );
    const subscription = getAutocompleteInfo().isLoading$.subscribe(
      debouncedSetFetchingAutocompleteEntities
    );

    return () => {
      subscription.unsubscribe();
      debouncedSetFetchingAutocompleteEntities.cancel();
    };
  }, [setFetchingAutocompleteEntities]);

  if (!currentTextObject) return <></>;

  return (
    <>
      {loading ? (
        <EditorContentSpinner />
      ) : (
        <MonacoEditor
          localStorageValue={currentTextObject.text}
          activeTabId={activeTabId}
          value={inputEditorValue}
          setValue={setInputEditorValue}
          customParsedRequestsProvider={customParsedRequestsProvider}
          skipInitialValue={skipInitialValue}
          allowDefaultValueWhenEmpty={allowDefaultValueWhenEmpty}
        />
      )}
    </>
  );
};
