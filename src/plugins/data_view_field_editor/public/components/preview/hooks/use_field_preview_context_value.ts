/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo } from 'react';
import type { BehaviorSubject } from 'rxjs';

import type { Context, EsDocument, FieldPreview, FetchDocError, From, Params } from '../types';

interface Args {
  fieldPreview$: BehaviorSubject<FieldPreview[] | undefined>;

  fields: Context['fields'];
  error: Context['error'];
  isPreviewAvailable: boolean;
  isLoadingPreview: boolean;
  initialPreviewComplete: boolean;

  params: Params;
  updateParams: Context['params']['update'];

  currentDocument?: EsDocument;
  currentDocId?: string;
  customDocIdToLoad: string | null;
  isCustomDocId: boolean;
  isFetchingDocument: boolean;

  fetchSampleDocuments: () => Promise<void>;
  loadSingleDocumentId: (id: string) => void;
  fetchDocError: FetchDocError | null;

  currentIdx: number;
  totalDocs: number;
  goToNextDoc: () => void;
  goToPrevDoc: () => void;

  isPanelVisible: boolean;
  setPanelVisible: (isVisible: boolean) => void;

  from: From;
  setFromValue: (value: From) => void;

  reset: () => void;
  pinnedFields: { [key: string]: boolean };
  setPinnedFields: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;

  setScriptEditorValidation: React.Dispatch<
    React.SetStateAction<{ isValid: boolean; isValidating: boolean; message: string | null }>
  >;
}

export const useFieldPreviewContextValue = ({
  fieldPreview$,
  fields,
  error,
  isPreviewAvailable,
  isLoadingPreview,
  initialPreviewComplete,
  params,
  updateParams,
  currentDocument,
  currentDocId,
  customDocIdToLoad,
  isCustomDocId,
  isFetchingDocument,
  fetchSampleDocuments,
  loadSingleDocumentId,
  fetchDocError,
  currentIdx,
  totalDocs,
  goToNextDoc,
  goToPrevDoc,
  isPanelVisible,
  setPanelVisible,
  from,
  setFromValue,
  reset,
  pinnedFields,
  setPinnedFields,
  setScriptEditorValidation,
}: Args): Context => {
  return useMemo<Context>(
    () => ({
      fields,
      error,
      fieldPreview$,
      isPreviewAvailable,
      isLoadingPreview,
      initialPreviewComplete,
      params: {
        value: params,
        update: updateParams,
      },
      currentDocument: {
        value: currentDocument,
        id: isCustomDocId ? customDocIdToLoad! : currentDocId,
        isLoading: isFetchingDocument,
        isCustomId: isCustomDocId,
      },
      documents: {
        loadSingle: loadSingleDocumentId,
        loadFromCluster: fetchSampleDocuments,
        fetchDocError,
      },
      navigation: {
        isFirstDoc: currentIdx === 0,
        isLastDoc: currentIdx >= totalDocs - 1,
        next: goToNextDoc,
        prev: goToPrevDoc,
      },
      panel: {
        isVisible: isPanelVisible,
        setIsVisible: setPanelVisible,
      },
      from: {
        value: from,
        set: setFromValue,
      },
      reset,
      pinnedFields: {
        value: pinnedFields,
        set: setPinnedFields,
      },
      validation: {
        setScriptEditorValidation,
      },
    }),
    [
      fields,
      error,
      fieldPreview$,
      isPreviewAvailable,
      isLoadingPreview,
      initialPreviewComplete,
      params,
      updateParams,
      currentDocument,
      currentDocId,
      customDocIdToLoad,
      isCustomDocId,
      isFetchingDocument,
      loadSingleDocumentId,
      fetchSampleDocuments,
      fetchDocError,
      currentIdx,
      totalDocs,
      goToNextDoc,
      goToPrevDoc,
      isPanelVisible,
      setPanelVisible,
      from,
      setFromValue,
      reset,
      pinnedFields,
      setPinnedFields,
      setScriptEditorValidation,
    ]
  );
};
