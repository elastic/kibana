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

import type { FieldPreviewContext } from '../../types';
import { parseEsError } from '../../lib/runtime_field_validation';
import { RuntimeType, RuntimeField } from '../../shared_imports';
import { useFieldEditorContext } from '../field_editor_context';

type From = 'cluster' | 'custom';

interface Context {
  fields: Array<{ key: string; value: unknown }>;
  error: Record<string, any> | null;
  updateParams: (updated: Partial<Params>) => void;
  currentDocument?: Record<string, any>;
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

interface Params {
  name: string | null;
  index: string | null;
  type: RuntimeType | null;
  script: Required<RuntimeField>['script'] | null;
  document: Record<string, any> | null;
}

const fieldPreviewContext = createContext<Context | undefined>(undefined);

const defaultParams: Params = { name: null, index: null, script: null, document: null, type: null };

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

  const [previewResponse, setPreviewResponse] = useState<{
    fields: Context['fields'];
    error: Context['error'];
  }>({ fields: [], error: null });
  const [params, setParams] = useState<Params>(defaultParams);
  const [documents, setDocuments] = useState<Array<Record<string, any>>>([]);
  const [navDocsIndex, setNavDocsIndex] = useState(0);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [from, setFrom] = useState<From>('cluster');

  const areAllParamsDefined =
    Object.values(params).filter(Boolean).length === Object.keys(defaultParams).length;

  const currentDocument: Record<string, any> | undefined = useMemo(() => documents[navDocsIndex], [
    documents,
    navDocsIndex,
  ]);

  const currentDocIndex = currentDocument?._index;
  const totalDocs = documents.length;

  const updateParams: Context['updateParams'] = useCallback((updated) => {
    setParams((prev) => ({ ...prev, ...updated }));
  }, []);

  const fetchSampleDocuments = useCallback(
    async (limit = 50) => {
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

      if (response) {
        setDocuments(response.rawResponse.hits.hits);
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
      setPreviewResponse({ fields: [], error: parseEsError(error, true) });
    } else {
      setPreviewResponse({
        fields: [{ key: params.name!, value: values[0] }],
        error: null,
      });
    }
  }, [fieldTypeToProcess, params, currentDocIndex, getFieldPreview, notifications.toasts]);

  const goToNextDoc = useCallback(() => {
    if (navDocsIndex >= totalDocs - 1) {
      return;
    }
    setNavDocsIndex((prev) => prev + 1);
  }, [navDocsIndex, totalDocs]);

  const goToPrevDoc = useCallback(() => {
    if (navDocsIndex === 0) {
      return;
    }
    setNavDocsIndex((prev) => prev - 1);
  }, [navDocsIndex]);

  const ctx = useMemo<Context>(
    () => ({
      fields: previewResponse.fields,
      error: previewResponse.error,
      updateParams,
      currentDocument,
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
      updateParams,
      currentDocument,
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

  useEffect(() => {
    if (fieldTypeToProcess === 'runtime') {
      fetchSampleDocuments();
    }
  }, [fetchSampleDocuments, fieldTypeToProcess]);

  useEffect(() => {
    updateParams({ document: currentDocument?._source });
  }, [currentDocument, updateParams]);

  useEffect(() => {
    updateParams({ index: currentDocIndex });
  }, [currentDocIndex, updateParams]);

  return <fieldPreviewContext.Provider value={ctx}>{children}</fieldPreviewContext.Provider>;
};

export const useFieldPreviewContext = (): Context => {
  const ctx = useContext(fieldPreviewContext);

  if (ctx === undefined) {
    throw new Error('useFieldPreviewContext must be used within a <FieldPreviewProvider />');
  }

  return ctx;
};
