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
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import type { FieldPreviewContext, FieldFormatConfig } from '../../types';
import { parseEsError } from '../../lib/runtime_field_validation';
import { RuntimeType, RuntimeField } from '../../shared_imports';
import { useFieldEditorContext } from '../field_editor_context';

type From = 'cluster' | 'custom';
type EsDocument = Record<string, any>;

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

interface Context {
  fields: Array<{ key: string; value: unknown }>;
  error: PreviewError | null;
  // The preview count will help us decide when to display the empty prompt
  previewCount: number;
  params: {
    value: Params;
    update: (updated: Partial<Params>) => void;
  };
  isLoadingPreview: boolean;
  currentDocument: {
    value?: EsDocument;
    loadSingle: (id: string) => Promise<void>;
    loadFromCluster: () => Promise<void>;
    isLoading: boolean;
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

export const FieldPreviewProvider: FunctionComponent = ({ children }) => {
  const previewCount = useRef(0);
  const {
    indexPattern,
    fieldTypeToProcess,
    services: {
      search,
      notifications,
      api: { getFieldPreview },
    },
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
  /** Define if we provide the document to preview from the cluster or from a custom JSON */
  const [from, setFrom] = useState<From>('cluster');

  const areAllParamsDefined = Object.entries(params)
    // We don't need the "format" information for the _execute API
    .filter(([key]) => key !== 'format')
    .every(([_, value]) => Boolean(value));

  const { documents, currentIdx } = clusterData;
  const currentDocument: Record<string, any> | undefined = useMemo(() => documents[currentIdx], [
    documents,
    currentIdx,
  ]);

  const currentDocIndex = currentDocument?._index;
  const totalDocs = documents.length;
  const { name, document, script, format } = params;

  const updateParams: Context['params']['update'] = useCallback((updated) => {
    setParams((prev) => ({ ...prev, ...updated }));
  }, []);

  const fetchSampleDocuments = useCallback(
    async (limit = 50) => {
      setIsFetchingDocument(true);
      setIsLoadingPreview(true);

      const response = await search
        .search({
          params: {
            index: indexPattern.title,
            body: {
              size: limit,
            },
          },
        })
        .toPromise();

      setIsFetchingDocument(false);

      setPreviewResponse({ fields: [], error: null });
      setClusterData({
        documents: response ? response.rawResponse.hits.hits : [],
        currentIdx: 0,
      });
    },
    [indexPattern, search]
  );

  const loadDocument = useCallback(
    async (id: string) => {
      setIsFetchingDocument(true);

      const [response, error] = await search
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

      let loadedDocuments: EsDocument[] = [];

      if (response) {
        if (response.rawResponse.hits.total > 0) {
          setPreviewResponse({ fields: [], error: null });
          loadedDocuments = response.rawResponse.hits.hits;
        } else {
          setPreviewResponse({
            fields: [],
            error: {
              code: 'DOC_NOT_FOUND',
              error: {
                message: i18n.translate(
                  'indexPatternFieldEditor.fieldPreview.error.documentNotFoundDescription',
                  {
                    defaultMessage:
                      'Error previewing the field as the document provided was not found.',
                  }
                ),
              },
            },
          });
        }
      } else if (error) {
        // TODO: improve this error handling when there is a server
        // error fetching a document
        setPreviewResponse({
          fields: [],
          error: {
            code: 'ERR_FETCHING_DOC',
            error: {
              message: error.toString(),
            },
          },
        });
      }

      setClusterData({
        documents: loadedDocuments,
        currentIdx: 0,
      });
    },
    [indexPattern, search]
  );

  const updatePreview = useCallback(async () => {
    if (fieldTypeToProcess !== 'runtime' || !areAllParamsDefined) {
      return;
    }

    const currentApiCall = ++previewCount.current;

    setIsLoadingPreview(true);

    const response = await getFieldPreview({
      index: currentDocIndex,
      document: params.document!,
      context: `${params.type!}_field` as FieldPreviewContext,
      script: params.script!,
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

    const data = response.data!;
    const { values, error } = data;

    if (error) {
      const fallBackError = {
        message: i18n.translate('indexPatternFieldEditor.fieldPreview.defaultErrorTitle', {
          defaultMessage: 'Error executing the script.',
        }),
      };

      setPreviewResponse({
        fields: [],
        error: { code: 'PAINLESS_SCRIPT_ERROR', error: parseEsError(error, true) ?? fallBackError },
      });
    } else {
      setPreviewResponse({
        fields: [{ key: params.name!, value: values[0] }],
        error: null,
      });
    }
  }, [
    fieldTypeToProcess,
    areAllParamsDefined,
    params,
    currentDocIndex,
    getFieldPreview,
    notifications.toasts,
  ]);

  const goToNextDoc = useCallback(() => {
    if (currentIdx >= totalDocs - 1) {
      setClusterData((prev) => ({ ...prev, currentIdx: 0 }));
    } else {
      setClusterData((prev) => ({ ...prev, currentIdx: prev.currentIdx + 1 }));
    }
    setIsLoadingPreview(true);
  }, [currentIdx, totalDocs]);

  const goToPrevDoc = useCallback(() => {
    if (currentIdx === 0) {
      setClusterData((prev) => ({ ...prev, currentIdx: totalDocs - 1 }));
    } else {
      setClusterData((prev) => ({ ...prev, currentIdx: prev.currentIdx - 1 }));
    }
    setIsLoadingPreview(true);
  }, [currentIdx, totalDocs]);

  const reset = useCallback(() => {
    // We increase the count of preview calls to discard any inflight
    // API call response coming in after calling reset()
    previewCount.current = ++previewCount.current;

    setClusterData({
      documents: [],
      currentIdx: 0,
    });
    setFrom('cluster');
    setPreviewResponse({ fields: [], error: null });
    setIsLoadingPreview(false);
    setIsFetchingDocument(false);
  }, []);

  const ctx = useMemo<Context>(
    () => ({
      fields: previewResponse.fields,
      error: previewResponse.error,
      isLoadingPreview,
      previewCount: previewCount.current,
      params: {
        value: params,
        update: updateParams,
      },
      currentDocument: {
        value: currentDocument,
        loadSingle: loadDocument,
        loadFromCluster: fetchSampleDocuments,
        isLoading: isFetchingDocument,
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
    }),
    [
      previewResponse,
      params,
      isLoadingPreview,
      updateParams,
      currentDocument,
      loadDocument,
      fetchSampleDocuments,
      isFetchingDocument,
      currentIdx,
      totalDocs,
      goToNextDoc,
      goToPrevDoc,
      isPanelVisible,
      from,
      reset,
    ]
  );

  useDebounce(
    // Whenever updatePreview() changes (meaning whenever any of the params changes)
    // we call it to update the preview response with the field(s) value or possible error.
    updatePreview,
    500,
    [updatePreview]
  );

  /**
   * When the component mounts, if we are creating/editing a runtime field
   * we fetch sample documents from the cluster to be able to preview the runtime
   * field along with other document fields
   */
  useEffect(() => {
    if (isPanelVisible && fieldTypeToProcess === 'runtime') {
      fetchSampleDocuments();
    }
  }, [isPanelVisible, fetchSampleDocuments, fieldTypeToProcess]);

  /**
   * Each time the current document changes we update the parameters
   * for the Painless _execute API call.
   */
  useEffect(() => {
    updateParams({
      document: currentDocument?._source,
      index: currentDocument?._index,
    });
  }, [currentDocument, updateParams]);

  useEffect(() => {
    if (name && document && script === null) {
      // We have a field name, a document loaded but no script (the set value toggle is
      // either turned off or we have a blank script). If we have a format then we'll
      // preview the field with the format by reading the value from _source
      if (format) {
        setPreviewResponse({
          fields: [{ key: name, value: get(document, name) }],
          error: null,
        });
      } else {
        // We don't have a format yet defined, we reset the preview.
        // This will display the empty prompt.
        setPreviewResponse({
          fields: [],
          error: null,
        });
      }
      setIsLoadingPreview(false);
    }
  }, [name, document, script, format]);

  return <fieldPreviewContext.Provider value={ctx}>{children}</fieldPreviewContext.Provider>;
};

export const useFieldPreviewContext = (): Context => {
  const ctx = useContext(fieldPreviewContext);

  if (ctx === undefined) {
    throw new Error('useFieldPreviewContext must be used within a <FieldPreviewProvider />');
  }

  return ctx;
};
