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
  FunctionComponent,
} from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';

import type { FieldPreviewContext, FieldFormatConfig } from '../../types';
import { parseEsError } from '../../lib/runtime_field_validation';
import { RuntimeType, RuntimeField } from '../../shared_imports';
import { useFieldEditorContext } from '../field_editor_context';

type From = 'cluster' | 'custom';

type EsDocument = Record<string, any>;

interface PreviewError {
  code: 'DOC_NOT_FOUND' | 'PAINLESS_SCRIPT_ERROR';
  error: Record<string, any>;
}

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
  params: {
    value: Params;
    update: (updated: Partial<Params>) => void;
  };
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
  const [documents, setDocuments] = useState<EsDocument[]>([]);
  /** The current Array index of the document we are previewing (when previewing from the cluster) */
  const [navDocsIndex, setNavDocsIndex] = useState(0);
  /** Flag to show/hide the preview panel */
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  /** Flag to indicate if we are loading document from cluster */
  const [isFetchingDocument, setIsFetchingDocument] = useState(false);
  /** Define if we provide the document to preview from the cluster or from a custom JSON */
  const [from, setFrom] = useState<From>('cluster');

  const areAllParamsDefined = Object.entries(params)
    // We don't need the "format" information for the _execute API
    .filter(([key]) => key !== 'format')
    .every(([_, value]) => Boolean(value));

  const currentDocument: Record<string, any> | undefined = useMemo(() => documents[navDocsIndex], [
    documents,
    navDocsIndex,
  ]);

  const currentDocIndex = currentDocument?._index;
  const totalDocs = documents.length;

  const updateParams: Context['params']['update'] = useCallback((updated) => {
    setParams((prev) => ({ ...prev, ...updated }));
  }, []);

  const fetchSampleDocuments = useCallback(
    async (limit = 50) => {
      setPreviewResponse({ fields: [], error: null });
      setIsFetchingDocument(true);

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
      setNavDocsIndex(0);

      if (response) {
        setDocuments(response.rawResponse.hits.hits);
      } else {
        setDocuments([]);
      }
    },
    [indexPattern, search]
  );

  const loadDocument = useCallback(
    async (id: string) => {
      setPreviewResponse({ fields: [], error: null });
      setIsFetchingDocument(true);

      const response = await search
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
        .toPromise();

      setIsFetchingDocument(false);
      setNavDocsIndex(0);

      if (response) {
        if (response.rawResponse.hits.total > 0) {
          setDocuments(response.rawResponse.hits.hits);
        } else {
          setDocuments([]);
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
      } else {
        setDocuments([]);
      }
    },
    [indexPattern, search]
  );

  const updatePreview = useCallback(async () => {
    if (fieldTypeToProcess !== 'runtime') {
      return;
    }

    const response = await getFieldPreview({
      index: currentDocIndex,
      document: params.document!,
      context: `${params.type!}_field` as FieldPreviewContext,
      script: params.script!,
    });

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
      const fallBackError = { message: 'Error executing the script.' };

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
  }, [fieldTypeToProcess, params, currentDocIndex, getFieldPreview, notifications.toasts]);

  const goToNextDoc = useCallback(() => {
    if (navDocsIndex >= totalDocs - 1) {
      setNavDocsIndex(0);
    }
    setNavDocsIndex((prev) => prev + 1);
  }, [navDocsIndex, totalDocs]);

  const goToPrevDoc = useCallback(() => {
    if (navDocsIndex === 0) {
      setNavDocsIndex(totalDocs - 1);
    }
    setNavDocsIndex((prev) => prev - 1);
  }, [navDocsIndex, totalDocs]);

  const ctx = useMemo<Context>(
    () => ({
      fields: previewResponse.fields,
      error: previewResponse.error,
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
        isFirstDoc: navDocsIndex === 0,
        isLastDoc: navDocsIndex >= totalDocs - 1,
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
    }),
    [
      previewResponse,
      params,
      updateParams,
      currentDocument,
      loadDocument,
      fetchSampleDocuments,
      isFetchingDocument,
      navDocsIndex,
      totalDocs,
      goToNextDoc,
      goToPrevDoc,
      isPanelVisible,
      from,
    ]
  );

  useDebounce(
    () => {
      if (!areAllParamsDefined) {
        return;
      }

      // Whenever updatePreview() changes (meaning whenever any of the params changes)
      // we call it to update the preview response with the field value or possible error.
      updatePreview();
    },
    500,
    [areAllParamsDefined, updatePreview]
  );

  /**
   * When the component mounts, if we are creating/editing a runtime field
   * we fetch sample documents from the cluster to be able to preview the runtime
   * field along with other document fields
   */
  useEffect(() => {
    if (fieldTypeToProcess === 'runtime') {
      fetchSampleDocuments();
    }
  }, [fetchSampleDocuments, fieldTypeToProcess]);

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

  return <fieldPreviewContext.Provider value={ctx}>{children}</fieldPreviewContext.Provider>;
};

export const useFieldPreviewContext = (): Context => {
  const ctx = useContext(fieldPreviewContext);

  if (ctx === undefined) {
    throw new Error('useFieldPreviewContext must be used within a <FieldPreviewProvider />');
  }

  return ctx;
};
