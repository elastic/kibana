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

import type { FieldPreviewContext, FieldFormatConfig } from '../../types';
import { parseEsError } from '../../lib/runtime_field_validation';
import { RuntimeType, RuntimeField } from '../../shared_imports';
import { useFieldEditorContext } from '../field_editor_context';

type From = 'cluster' | 'custom';
interface EsDocument {
  _id: string;
  [key: string]: any;
}

interface PreviewError {
  code: 'DOC_NOT_FOUND' | 'PAINLESS_SCRIPT_ERROR' | 'ERR_FETCHING_DOC';
  error: Record<string, any>;
}

interface ClusterData {
  documents: EsDocument[];
  currentIdx: number;
}

// The parameters required to preview the field
interface Params {
  name: string | null;
  index: string | null;
  type: RuntimeType | null;
  script: Required<RuntimeField>['script'] | null;
  format: FieldFormatConfig | null;
  document: EsDocument | null;
}

export interface FieldPreview {
  key: string;
  value: unknown;
  formattedValue?: string;
}

interface Context {
  fields: FieldPreview[];
  error: PreviewError | null;
  params: {
    value: Params;
    update: (updated: Partial<Params>) => void;
  };
  isLoadingPreview: boolean;
  currentDocument: {
    value?: EsDocument;
    id: string;
    isLoading: boolean;
    isCustomId: boolean;
  };
  documents: {
    loadSingle: (id: string) => void;
    loadFromCluster: () => Promise<void>;
  };
  panel: {
    isVisible: boolean;
    setIsVisible: (isVisible: boolean) => void;
  };
  from: {
    value: From;
    set: (value: From) => void;
  };
  navigation: {
    isFirstDoc: boolean;
    isLastDoc: boolean;
    next: () => void;
    prev: () => void;
  };
  reset: () => void;
  pinnedFields: {
    value: { [key: string]: boolean };
    set: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  };
}

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
  const content = typeof value === 'object' ? JSON.stringify(value) : value ?? '-';
  return renderToString(<>{content}</>);
};

export const FieldPreviewProvider: FunctionComponent = ({ children }) => {
  const previewCount = useRef(0);
  const [lastExecutePainlessRequestParams, setLastExecutePainlessReqParams] = useState<{
    type: Params['type'];
    script: string | undefined;
    documentId: string | undefined;
  }>({
    type: null,
    script: undefined,
    documentId: undefined,
  });

  const {
    indexPattern,
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
  /** The parameters required for the Painless _execute API */
  const [params, setParams] = useState<Params>(defaultParams);
  /** The sample documents fetched from the cluster */
  const [clusterData, setClusterData] = useState<ClusterData>({
    documents: [],
    currentIdx: 0,
  });
  /** Flag to show/hide the preview panel */
  const [isPanelVisible, setIsPanelVisible] = useState(false);
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

  const { documents, currentIdx } = clusterData;
  const currentDocument: EsDocument | undefined = useMemo(
    () => documents[currentIdx],
    [documents, currentIdx]
  );

  const currentDocId: string = currentDocument?._id ?? '';
  const totalDocs = documents.length;
  const { name, document, script, format, type } = params;

  const updateParams: Context['params']['update'] = useCallback((updated) => {
    setParams((prev) => ({ ...prev, ...updated }));
  }, []);

  const needToUpdatePreview = useMemo(() => {
    const isCurrentDocIdDefined = currentDocId !== '';

    if (!isCurrentDocIdDefined) {
      return false;
    }

    const allParamsDefined = (['type', 'script', 'index', 'document'] as Array<keyof Params>).every(
      (key) => Boolean(params[key])
    );

    if (!allParamsDefined) {
      return false;
    }

    const hasSomeParamsChanged =
      lastExecutePainlessRequestParams.type !== type ||
      lastExecutePainlessRequestParams.script !== script?.source ||
      lastExecutePainlessRequestParams.documentId !== currentDocId;

    return hasSomeParamsChanged;
  }, [type, script?.source, currentDocId, params, lastExecutePainlessRequestParams]);

  const valueFormatter = useCallback(
    (value: unknown) => {
      if (format?.id) {
        const formatter = fieldFormats.getInstance(format.id, format.params);
        if (formatter) {
          return formatter.convertObject?.html(value) ?? JSON.stringify(value);
        }
      }

      return defaultValueFormatter(value);
    },
    [format, fieldFormats]
  );

  const fetchSampleDocuments = useCallback(
    async (limit: number = 50) => {
      if (typeof limit !== 'number') {
        // We guard ourself from passing an <input /> event accidentally
        throw new Error('The "limit" option must be a number');
      }

      setIsFetchingDocument(true);
      setClusterData({
        documents: [],
        currentIdx: 0,
      });
      setPreviewResponse({ fields: [], error: null });

      const [response, error] = await search
        .search({
          params: {
            index: indexPattern.title,
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

      setClusterData({
        documents: response ? response.rawResponse.hits.hits : [],
        currentIdx: 0,
      });

      setPreviewResponse((prev) => ({ ...prev, error }));
    },
    [indexPattern, search]
  );

  const loadDocument = useCallback(
    async (id: string) => {
      if (!Boolean(id.trim())) {
        return;
      }

      setIsFetchingDocument(true);

      const [response, searchError] = await search
        .search({
          params: {
            index: indexPattern.title,
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
      const error: Context['error'] = Boolean(searchError)
        ? {
            code: 'ERR_FETCHING_DOC',
            error: {
              message: searchError.toString(),
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

      setPreviewResponse((prev) => ({ ...prev, error }));

      setClusterData({
        documents: loadedDocuments,
        currentIdx: 0,
      });

      if (error !== null) {
        // Make sure we disable the "Updating..." indicator as we have an error
        // and we won't fetch the preview
        setIsLoadingPreview(false);
      }
    },
    [indexPattern, search]
  );

  const updatePreview = useCallback(async () => {
    setLastExecutePainlessReqParams({
      type: params.type,
      script: params.script?.source,
      documentId: currentDocId,
    });

    if (!needToUpdatePreview) {
      return;
    }

    const currentApiCall = ++previewCount.current;

    const response = await getFieldPreview({
      index: indexPattern.title,
      document: params.document!,
      context: `${params.type!}_field` as FieldPreviewContext,
      script: params.script!,
      documentId: currentDocId,
    });

    if (currentApiCall !== previewCount.current) {
      // Discard this response as there is another one inflight
      // or we have called reset() and don't need the response anymore.
      return;
    }

    setIsLoadingPreview(false);

    const { error: serverError } = response;

    if (serverError) {
      // Server error (not an ES error)
      const title = i18n.translate('indexPatternFieldEditor.fieldPreview.errorTitle', {
        defaultMessage: 'Failed to load field preview',
      });
      notifications.toasts.addError(serverError, { title });

      return;
    }

    const { values, error } = response.data ?? { values: [], error: {} };

    if (error) {
      const fallBackError = {
        message: i18n.translate('indexPatternFieldEditor.fieldPreview.defaultErrorTitle', {
          defaultMessage: 'Unable to run the provided script',
        }),
      };

      setPreviewResponse({
        fields: [],
        error: { code: 'PAINLESS_SCRIPT_ERROR', error: parseEsError(error, true) ?? fallBackError },
      });
    } else {
      const [value] = values;
      const formattedValue = valueFormatter(value);

      setPreviewResponse({
        fields: [{ key: params.name!, value, formattedValue }],
        error: null,
      });
    }
  }, [
    needToUpdatePreview,
    params,
    currentDocId,
    getFieldPreview,
    notifications.toasts,
    valueFormatter,
    indexPattern.title,
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
    setLastExecutePainlessReqParams({
      type: null,
      script: undefined,
      documentId: undefined,
    });
    setFrom('cluster');
    setIsLoadingPreview(false);
    setIsFetchingDocument(false);
  }, []);

  const ctx = useMemo<Context>(
    () => ({
      fields: previewResponse.fields,
      error: previewResponse.error,
      isLoadingPreview,
      params: {
        value: params,
        update: updateParams,
      },
      currentDocument: {
        value: currentDocument,
        id: customDocIdToLoad !== null ? customDocIdToLoad : currentDocId,
        isLoading: isFetchingDocument,
        isCustomId: customDocIdToLoad !== null,
      },
      documents: {
        loadSingle: setCustomDocIdToLoad,
        loadFromCluster: fetchSampleDocuments,
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
    }),
    [
      previewResponse,
      params,
      isLoadingPreview,
      updateParams,
      currentDocument,
      currentDocId,
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
   * the 500ms of the debounce, we set the isLoadingPreview state in this effect
   */
  useEffect(() => {
    if (needToUpdatePreview) {
      setIsLoadingPreview(true);
    }
  }, [needToUpdatePreview, customDocIdToLoad]);

  /**
   * Whenever we enter manually a document ID to load we'll clear the
   * documents and the preview value.
   */
  useEffect(() => {
    if (customDocIdToLoad !== null) {
      setIsFetchingDocument(true);

      setClusterData({
        documents: [],
        currentIdx: 0,
      });

      setPreviewResponse((prev) => {
        const {
          fields: { 0: field },
        } = prev;
        return {
          ...prev,
          fields: [
            { ...field, value: undefined, formattedValue: defaultValueFormatter(undefined) },
          ],
        };
      });
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

  useDebounce(
    // Whenever updatePreview() changes (meaning whenever any of the params changes)
    // we call it to update the preview response with the field(s) value or possible error.
    updatePreview,
    500,
    [updatePreview]
  );

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
