/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useReducer,
  useState,
  useContext,
  useMemo,
  useCallback,
  useRef,
  FunctionComponent,
} from 'react';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { BehaviorSubject } from 'rxjs';

import { useFieldEditorContext } from '../field_editor_context';
import {
  useDocumentsActions,
  useFieldPreviewContextValue,
  usePreviewDerivedState,
  usePreviewExecution,
  usePreviewSideEffects,
} from './hooks';
import { defaultValueFormatter } from './utils/formatters';
import {
  documentsReducer,
  initialDocumentsState,
  initialPreviewState,
  previewReducer,
} from './reducers';
import type { Context, Params, From, EsDocument, FieldPreview } from './types';

const fieldPreviewContext = createContext<Context | undefined>(undefined);

const defaultParams: Params = {
  name: null,
  script: null,
  type: null,
  format: null,
  parentName: null,
};

export { defaultValueFormatter, valueTypeToSelectedType } from './utils/formatters';

export const FieldPreviewProvider: FunctionComponent = ({ children }) => {
  const previewCount = useRef(0);

  // We keep in cache the latest params sent to the _execute API so we don't make unecessary requests
  // when changing parameters that don't affect the preview result (e.g. changing the "name" field).
  const lastExecutePainlessRequestParams = useRef<{
    type: Params['type'];
    script: string | undefined;
    documentId: string | undefined;
  }>({
    type: null,
    script: undefined,
    documentId: undefined,
  });

  const {
    dataView,
    fieldTypeToProcess,
    services: {
      search,
      notifications,
      api: { getFieldPreview },
    },
    fieldFormats,
    fieldName$,
  } = useFieldEditorContext();

  const fieldPreview$ = useRef(new BehaviorSubject<FieldPreview[] | undefined>(undefined));

  const [documentsState, documentsDispatch] = useReducer(documentsReducer, initialDocumentsState);
  const [previewState, previewDispatch] = useReducer(previewReducer, initialPreviewState);

  const { clusterData, fetchDocError, isFetchingDocumentInFlight } = documentsState;
  const { previewResponse, isLoadingPreviewInFlight, initialPreviewComplete } = previewState;

  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [customDocIdToLoad, setCustomDocIdToLoad] = useState<string | null>(null);
  const [from, setFrom] = useState<From>('cluster');

  /** The parameters required for the Painless _execute API */
  const [params, setParams] = useState<Params>(defaultParams);
  /** Map of fields pinned to the top of the list */
  const [pinnedFields, setPinnedFields] = useState<{ [key: string]: boolean }>({});
  /** Keep track if the script painless syntax is being validated and if it is valid  */
  const [scriptEditorValidation, setScriptEditorValidation] = useState<{
    isValidating: boolean;
    isValid: boolean;
    message: string | null;
  }>({ isValidating: false, isValid: true, message: null });

  const { documents, currentIdx } = clusterData;
  const currentDocument: EsDocument | undefined = documents[currentIdx];
  const currentDocIndex: string | undefined = currentDocument?._index;
  const currentDocId: string | undefined = currentDocument?._id;
  const totalDocs = documents.length;
  const isCustomDocId = customDocIdToLoad !== null;

  const { name, script, format, type, parentName } = params;

  const updateParams: Context['params']['update'] = useCallback((updated) => {
    setParams((prev) => ({ ...prev, ...updated }));
  }, []);

  const setPanelVisible = useCallback((isVisible: boolean) => {
    setIsPanelVisible(isVisible);
  }, []);

  const setDocIdToLoad = useCallback((docId: string) => {
    setCustomDocIdToLoad(docId);
  }, []);

  const setFromValue = useCallback((nextFrom: From) => {
    setFrom(nextFrom);
  }, []);

  const allParamsDefined = useMemo(() => {
    if (!currentDocIndex || !script?.source || !type) {
      return false;
    }
    return true;
  }, [currentDocIndex, script?.source, type]);

  const hasSomeParamsChanged = useMemo(() => {
    return (
      lastExecutePainlessRequestParams.current.type !== type ||
      lastExecutePainlessRequestParams.current.script !== script?.source ||
      lastExecutePainlessRequestParams.current.documentId !== currentDocId
    );
  }, [type, script?.source, currentDocId]);

  const valueFormatter = useCallback(
    (value: unknown) => {
      if (format?.id) {
        const formatter = fieldFormats.getInstance(format.id, format.params);
        if (formatter) {
          return formatter.getConverterFor('html')(value) ?? JSON.stringify(value);
        }
      }

      if (type) {
        const fieldType = castEsToKbnFieldTypeName(type);
        const defaultFormatterForType = fieldFormats.getDefaultInstance(fieldType);
        if (defaultFormatterForType) {
          return defaultFormatterForType.getConverterFor('html')(value) ?? JSON.stringify(value);
        }
      }

      return defaultValueFormatter(value);
    },
    [format, type, fieldFormats]
  );

  const { fetchSampleDocuments: fetchSampleDocumentsBase, loadDocument } = useDocumentsActions({
    dataView,
    search,
    documentsDispatch,
    previewDispatch,
    lastExecutePainlessRequestParams,
  });

  const fetchSampleDocuments = useCallback(
    async (limit?: number) => {
      setCustomDocIdToLoad(null);
      await fetchSampleDocumentsBase(limit);
    },
    [fetchSampleDocumentsBase]
  );

  const { updatePreview } = usePreviewExecution({
    name,
    type,
    script,
    parentName,
    dataView,
    getFieldPreview,
    toasts: notifications.toasts,
    currentDocIndex,
    currentDocId,
    currentDocument,
    allParamsDefined,
    hasSomeParamsChanged,
    scriptEditorValidation,
    fieldName$,
    fieldPreview$: fieldPreview$.current,
    valueFormatter,
    previewDispatch,
    previewCount,
    lastExecutePainlessRequestParams,
  });

  const goToNextDoc = useCallback(() => {
    documentsDispatch({ type: 'NAV_NEXT' });
  }, [documentsDispatch]);

  const goToPrevDoc = useCallback(() => {
    documentsDispatch({ type: 'NAV_PREV' });
  }, [documentsDispatch]);

  const reset = useCallback(() => {
    // By resetting the previewCount we will discard previous inflight
    // API call response coming in after calling reset() was called
    previewCount.current = 0;

    documentsDispatch({ type: 'RESET_DOCUMENTS' });
    previewDispatch({ type: 'RESET_PREVIEW_RESPONSE' });
    setCustomDocIdToLoad(null);
    setFrom('cluster');
    setIsPanelVisible(true);
  }, [documentsDispatch, previewDispatch]);

  const { fields, error, isPreviewAvailable, isLoadingPreview, isFetchingDocument } =
    usePreviewDerivedState({
      previewResponse,
      scriptEditorValidation,
      params,
      currentDocumentSource: currentDocument?._source,
      valueFormatter,
      allParamsDefined,
      hasSomeParamsChanged,
      isLoadingPreviewInFlight,
      isFetchingDocumentInFlight,
      isCustomDocId,
      customDocIdToLoad,
      totalDocs,
    });

  const ctx = useFieldPreviewContextValue({
    fieldPreview$: fieldPreview$.current,
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
    loadSingleDocumentId: setDocIdToLoad,
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
  });

  usePreviewSideEffects({
    isPanelVisible,
    refetchKey: fieldTypeToProcess,
    fetchSampleDocuments,
    updatePreview,
    customDocIdToLoad,
    loadDocument,
  });

  return <fieldPreviewContext.Provider value={ctx}>{children}</fieldPreviewContext.Provider>;
};

export const useFieldPreviewContext = (): Context => {
  const ctx = useContext(fieldPreviewContext);

  if (ctx === undefined) {
    throw new Error('useFieldPreviewContext must be used within a <FieldPreviewProvider />');
  }

  return ctx;
};
