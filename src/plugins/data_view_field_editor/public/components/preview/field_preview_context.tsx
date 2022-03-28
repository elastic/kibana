/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  FunctionComponent,
} from 'react';
import { renderToString } from 'react-dom/server';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';

import { parseEsError } from '../../lib/runtime_field_validation';
import { useFieldEditorContext } from '../field_editor_context';
import type {
  PainlessExecuteContext,
  Context,
  Params,
  ClusterData,
  From,
  EsDocument,
  ScriptErrorCodes,
  FetchDocError,
} from './types';

const fieldPreviewContext = createContext<Context | undefined>(undefined);

const defaultParams: Params = {
  name: null,
  index: null,
  script: null,
  document: null,
  type: null,
  format: null,
};

export const defaultValueFormatter = (value: unknown) => {
  const content = typeof value === 'object' ? JSON.stringify(value) : String(value) ?? '-';
  return renderToString(<>{content}</>);
};

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
  } = useFieldEditorContext();

  /** Response from the Painless _execute API */
  const [previewResponse, setPreviewResponse] = useState<{
    fields: Context['fields'];
    error: Context['error'];
  }>({ fields: [], error: null });
  /** Possible error while fetching sample documents */
  const [fetchDocError, setFetchDocError] = useState<FetchDocError | null>(null);
  /** The parameters required for the Painless _execute API */
  const [params, setParams] = useState<Params>(defaultParams);
  /** The sample documents fetched from the cluster */
  const [clusterData, setClusterData] = useState<ClusterData>({
    documents: [],
    currentIdx: 0,
  });
  /** Flag to show/hide the preview panel */
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  /** Flag to indicate if we are loading document from cluster */
  const [isFetchingDocument, setIsFetchingDocument] = useState(false);
  /** Flag to indicate if we are calling the _execute API */
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  /** Flag to indicate if we are loading a single document by providing its ID */
  const [customDocIdToLoad, setCustomDocIdToLoad] = useState<string | null>(null);
  /** Define if we provide the document to preview from the cluster or from a custom JSON */
  const [from, setFrom] = useState<From>('cluster');
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
  let isPreviewAvailable = true;

  // If no documents could be fetched from the cluster (and we are not trying to load
  // a custom doc ID) then we disable preview as the script field validation expect the result
  // of the preview to before resolving. If there are no documents we can't have a preview
  // (the _execute API expects one) and thus the validation should not expect any value.
  if (!isFetchingDocument && !isCustomDocId && documents.length === 0) {
    isPreviewAvailable = false;
  }

  const { name, document, script, format, type } = params;

  const updateParams: Context['params']['update'] = useCallback((updated) => {
    setParams((prev) => ({ ...prev, ...updated }));
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
  }, [type, script, currentDocId]);

  const setPreviewError = useCallback((error: Context['error']) => {
    setPreviewResponse((prev) => ({
      ...prev,
      error,
    }));
  }, []);

  const clearPreviewError = useCallback((errorCode: ScriptErrorCodes) => {
    setPreviewResponse((prev) => {
      const error = prev.error === null || prev.error?.code === errorCode ? null : prev.error;
      return {
        ...prev,
        error,
      };
    });
  }, []);

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

  const fetchSampleDocuments = useCallback(
    async (limit: number = 50) => {
      if (typeof limit !== 'number') {
        // We guard ourself from passing an <input /> event accidentally
        throw new Error('The "limit" option must be a number');
      }

      lastExecutePainlessRequestParams.current.documentId = undefined;
      setIsFetchingDocument(true);
      setPreviewResponse({ fields: [], error: null });

      const [response, searchError] = await search
        .search({
          params: {
            index: dataView.title,
            body: {
              size: limit,
            },
          },
        })
        .toPromise()
        .then((res) => [res, null])
        .catch((err) => [null, err]);

      setIsFetchingDocument(false);
      setCustomDocIdToLoad(null);

      const error: FetchDocError | null = Boolean(searchError)
        ? {
            code: 'ERR_FETCHING_DOC',
            error: {
              message: searchError.toString(),
              reason: i18n.translate(
                'indexPatternFieldEditor.fieldPreview.error.errorLoadingSampleDocumentsDescription',
                {
                  defaultMessage: 'Error loading sample documents.',
                }
              ),
            },
          }
        : null;

      setFetchDocError(error);

      if (error === null) {
        setClusterData({
          documents: response ? response.rawResponse.hits.hits : [],
          currentIdx: 0,
        });
      }
    },
    [dataView, search]
  );

  const loadDocument = useCallback(
    async (id: string) => {
      if (!Boolean(id.trim())) {
        return;
      }

      lastExecutePainlessRequestParams.current.documentId = undefined;
      setIsFetchingDocument(true);

      const [response, searchError] = await search
        .search({
          params: {
            index: dataView.title,
            body: {
              size: 1,
              query: {
                ids: {
                  values: [id],
                },
              },
            },
          },
        })
        .toPromise()
        .then((res) => [res, null])
        .catch((err) => [null, err]);

      setIsFetchingDocument(false);

      const isDocumentFound = response?.rawResponse.hits.total > 0;
      const loadedDocuments: EsDocument[] = isDocumentFound ? response.rawResponse.hits.hits : [];
      const error: FetchDocError | null = Boolean(searchError)
        ? {
            code: 'ERR_FETCHING_DOC',
            error: {
              message: searchError.toString(),
              reason: i18n.translate(
                'indexPatternFieldEditor.fieldPreview.error.errorLoadingDocumentDescription',
                {
                  defaultMessage: 'Error loading document.',
                }
              ),
            },
          }
        : isDocumentFound === false
        ? {
            code: 'DOC_NOT_FOUND',
            error: {
              message: i18n.translate(
                'indexPatternFieldEditor.fieldPreview.error.documentNotFoundDescription',
                {
                  defaultMessage: 'Document ID not found',
                }
              ),
            },
          }
        : null;

      setFetchDocError(error);

      if (error === null) {
        setClusterData({
          documents: loadedDocuments,
          currentIdx: 0,
        });
      } else {
        // Make sure we disable the "Updating..." indicator as we have an error
        // and we won't fetch the preview
        setIsLoadingPreview(false);
      }
    },
    [dataView, search]
  );

  const updatePreview = useCallback(async () => {
    if (scriptEditorValidation.isValidating) {
      return;
    }

    if (!allParamsDefined || !hasSomeParamsChanged || scriptEditorValidation.isValid === false) {
      setIsLoadingPreview(false);
      return;
    }

    lastExecutePainlessRequestParams.current = {
      type,
      script: script?.source,
      documentId: currentDocId,
    };

    const currentApiCall = ++previewCount.current;

    const response = await getFieldPreview({
      index: dataView.title,
      document: document!,
      context: `${type!}_field` as PainlessExecuteContext,
      script: script!,
    });

    if (currentApiCall !== previewCount.current) {
      // Discard this response as there is another one inflight
      // or we have called reset() and don't need the response anymore.
      return;
    }

    const { error: serverError } = response;

    if (serverError) {
      // Server error (not an ES error)
      const title = i18n.translate('indexPatternFieldEditor.fieldPreview.errorTitle', {
        defaultMessage: 'Failed to load field preview',
      });
      notifications.toasts.addError(serverError, { title });

      setIsLoadingPreview(false);
      return;
    }

    if (response.data) {
      const { values, error } = response.data;

      if (error) {
        setPreviewResponse({
          fields: [{ key: name ?? '', value: '', formattedValue: defaultValueFormatter('') }],
          error: { code: 'PAINLESS_SCRIPT_ERROR', error: parseEsError(error) },
        });
      } else {
        const [value] = values;
        const formattedValue = valueFormatter(value);

        setPreviewResponse({
          fields: [{ key: name!, value, formattedValue }],
          error: null,
        });
      }
    }

    setIsLoadingPreview(false);
  }, [
    name,
    type,
    script,
    document,
    currentDocId,
    getFieldPreview,
    notifications.toasts,
    valueFormatter,
    allParamsDefined,
    scriptEditorValidation,
    hasSomeParamsChanged,
    dataView.title,
  ]);

  const goToNextDoc = useCallback(() => {
    if (currentIdx >= totalDocs - 1) {
      setClusterData((prev) => ({ ...prev, currentIdx: 0 }));
    } else {
      setClusterData((prev) => ({ ...prev, currentIdx: prev.currentIdx + 1 }));
    }
  }, [currentIdx, totalDocs]);

  const goToPrevDoc = useCallback(() => {
    if (currentIdx === 0) {
      setClusterData((prev) => ({ ...prev, currentIdx: totalDocs - 1 }));
    } else {
      setClusterData((prev) => ({ ...prev, currentIdx: prev.currentIdx - 1 }));
    }
  }, [currentIdx, totalDocs]);

  const reset = useCallback(() => {
    // By resetting the previewCount we will discard any inflight
    // API call response coming in after calling reset() was called
    previewCount.current = 0;

    setClusterData({
      documents: [],
      currentIdx: 0,
    });
    setPreviewResponse({ fields: [], error: null });
    setFrom('cluster');
    setIsLoadingPreview(false);
    setIsFetchingDocument(false);
  }, []);

  const ctx = useMemo<Context>(
    () => ({
      fields: previewResponse.fields,
      error: previewResponse.error,
      isPreviewAvailable,
      isLoadingPreview,
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
        loadSingle: setCustomDocIdToLoad,
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
        setIsVisible: setIsPanelVisible,
      },
      from: {
        value: from,
        set: setFrom,
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
      previewResponse,
      fetchDocError,
      params,
      isPreviewAvailable,
      isLoadingPreview,
      updateParams,
      currentDocument,
      currentDocId,
      isCustomDocId,
      fetchSampleDocuments,
      isFetchingDocument,
      customDocIdToLoad,
      currentIdx,
      totalDocs,
      goToNextDoc,
      goToPrevDoc,
      isPanelVisible,
      from,
      reset,
      pinnedFields,
    ]
  );

  /**
   * In order to immediately display the "Updating..." state indicator and not have to wait
   * the 500ms of the debounce, we set the isLoadingPreview state in this effect whenever
   * one of the _execute API param changes
   */
  useEffect(() => {
    if (allParamsDefined && hasSomeParamsChanged) {
      setIsLoadingPreview(true);
    }
  }, [allParamsDefined, hasSomeParamsChanged, script?.source, type, currentDocId]);

  /**
   * In order to immediately display the "Updating..." state indicator and not have to wait
   * the 500ms of the debounce, we set the isFetchingDocument state in this effect whenever
   * "customDocIdToLoad" changes
   */
  useEffect(() => {
    if (customDocIdToLoad !== null && Boolean(customDocIdToLoad.trim())) {
      setIsFetchingDocument(true);
    }
  }, [customDocIdToLoad]);

  /**
   * Whenever we show the preview panel we will update the documents from the cluster
   */
  useEffect(() => {
    if (isPanelVisible) {
      fetchSampleDocuments();
    }
  }, [isPanelVisible, fetchSampleDocuments, fieldTypeToProcess]);

  /**
   * Each time the current document changes we update the parameters
   * that will be sent in the _execute HTTP request.
   */
  useEffect(() => {
    updateParams({
      document: currentDocument?._source,
      index: currentDocument?._index,
    });
  }, [currentDocument, updateParams]);

  /**
   * Whenever the name or the format changes we immediately update the preview
   */
  useEffect(() => {
    setPreviewResponse((prev) => {
      const {
        fields: { 0: field },
      } = prev;

      const nextValue =
        script === null && Boolean(document)
          ? get(document, name ?? '') // When there is no script we read the value from _source
          : field?.value;

      const formattedValue = valueFormatter(nextValue);

      return {
        ...prev,
        fields: [{ ...field, key: name ?? '', value: nextValue, formattedValue }],
      };
    });
  }, [name, script, document, valueFormatter]);

  useEffect(() => {
    if (script?.source === undefined) {
      // Whenever the source is not defined ("Set value" is toggled off or the
      // script is empty) we clear the error and update the params cache.
      lastExecutePainlessRequestParams.current.script = undefined;
      setPreviewError(null);
    }
  }, [script?.source, setPreviewError]);

  // Handle the validation state coming from the Painless DiagnosticAdapter
  // (see @kbn-monaco/src/painless/diagnostics_adapter.ts)
  useEffect(() => {
    if (scriptEditorValidation.isValidating) {
      return;
    }

    if (scriptEditorValidation.isValid === false) {
      // Make sure to remove the "Updating..." spinner
      setIsLoadingPreview(false);

      // Set preview response error so it is displayed in the flyout footer
      const error =
        script?.source === undefined
          ? null
          : {
              code: 'PAINLESS_SYNTAX_ERROR' as const,
              error: {
                reason:
                  scriptEditorValidation.message ??
                  i18n.translate('indexPatternFieldEditor.fieldPreview.error.painlessSyntax', {
                    defaultMessage: 'Invalid Painless syntax',
                  }),
              },
            };
      setPreviewError(error);

      // Make sure to update the lastExecutePainlessRequestParams cache so when the user updates
      // the script and fixes the syntax the "updatePreview()" will run
      lastExecutePainlessRequestParams.current.script = script?.source;
    } else {
      // Clear possible previous syntax error
      clearPreviewError('PAINLESS_SYNTAX_ERROR');
    }
  }, [scriptEditorValidation, script?.source, setPreviewError, clearPreviewError]);

  /**
   * Whenever updatePreview() changes (meaning whenever any of the params changes)
   * we call it to update the preview response with the field(s) value or possible error.
   */
  useDebounce(updatePreview, 500, [updatePreview]);

  /**
   * Whenever the doc ID to load changes we load the document (after a 500ms debounce)
   */
  useDebounce(
    () => {
      if (customDocIdToLoad === null) {
        return;
      }

      loadDocument(customDocIdToLoad);
    },
    500,
    [customDocIdToLoad]
  );

  return <fieldPreviewContext.Provider value={ctx}>{children}</fieldPreviewContext.Provider>;
};

export const useFieldPreviewContext = (): Context => {
  const ctx = useContext(fieldPreviewContext);

  if (ctx === undefined) {
    throw new Error('useFieldPreviewContext must be used within a <FieldPreviewProvider />');
  }

  return ctx;
};
