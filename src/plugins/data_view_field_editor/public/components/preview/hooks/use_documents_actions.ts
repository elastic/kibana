/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';

import type { DataPublicPluginStart, DataView } from '../../../shared_imports';
import type { FetchDocError, EsDocument } from '../types';
import type { DocumentsAction } from '../reducers';
import type { PreviewAction } from '../reducers';

type SearchObservable = ReturnType<DataPublicPluginStart['search']['search']>;
type SearchResponse = Awaited<ReturnType<SearchObservable['toPromise']>>;

interface Args {
  dataView: DataView;
  search: DataPublicPluginStart['search'];
  documentsDispatch: React.Dispatch<DocumentsAction>;
  previewDispatch: React.Dispatch<PreviewAction>;
  lastExecutePainlessRequestParams: React.MutableRefObject<{
    type: unknown;
    script: string | undefined;
    documentId: string | undefined;
  }>;
}

export const useDocumentsActions = ({
  dataView,
  search,
  documentsDispatch,
  previewDispatch,
  lastExecutePainlessRequestParams,
}: Args) => {
  const fetchSampleDocuments = useCallback(
    async (limit: number = 50) => {
      if (typeof limit !== 'number') {
        // We guard ourself from passing an <input /> event accidentally
        throw new Error('The "limit" option must be a number');
      }

      lastExecutePainlessRequestParams.current.documentId = undefined;
      documentsDispatch({ type: 'FETCH_SAMPLE_START' });
      previewDispatch({ type: 'RESET_PREVIEW_RESPONSE' });

      let response: SearchResponse | null = null;
      let searchError: unknown = null;
      try {
        response = await search
          .search({
            params: {
              index: dataView.getIndexPattern(),
              body: {
                size: limit,
              },
            },
          })
          .toPromise();
      } catch (err) {
        searchError = err;
      }

      const error: FetchDocError | null = Boolean(searchError)
        ? {
            code: 'ERR_FETCHING_DOC',
            error: {
              message: String(searchError),
              reason: i18n.translate(
                'indexPatternFieldEditor.fieldPreview.error.errorLoadingSampleDocumentsDescription',
                {
                  defaultMessage: 'Error loading sample documents.',
                }
              ),
            },
          }
        : null;

      documentsDispatch({
        type: 'FETCH_SAMPLE_FINISH',
        error,
        documents: response ? response.rawResponse.hits.hits : [],
      });
    },
    [dataView, search, documentsDispatch, previewDispatch, lastExecutePainlessRequestParams]
  );

  const loadDocument = useCallback(
    async (id: string) => {
      if (!Boolean(id.trim())) {
        return;
      }

      lastExecutePainlessRequestParams.current.documentId = undefined;
      documentsDispatch({ type: 'LOAD_DOC_START' });

      let response: SearchResponse | null = null;
      let searchError: unknown = null;
      try {
        response = await search
          .search({
            params: {
              index: dataView.getIndexPattern(),
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
      } catch (err) {
        searchError = err;
      }

      const totalHits = response ? Number(response.rawResponse.hits.total) : 0;
      const isDocumentFound = totalHits > 0;
      const loadedDocuments: EsDocument[] =
        isDocumentFound && response ? response.rawResponse.hits.hits : [];
      const error: FetchDocError | null = Boolean(searchError)
        ? {
            code: 'ERR_FETCHING_DOC',
            error: {
              message: String(searchError),
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

      documentsDispatch({ type: 'LOAD_DOC_FINISH', error, documents: loadedDocuments });

      if (error !== null) {
        // Make sure we disable the "Updating..." indicator as we have an error
        // and we won't fetch the preview
        previewDispatch({ type: 'SET_LOADING_IN_FLIGHT', isLoadingPreviewInFlight: false });
      }
    },
    [dataView, search, documentsDispatch, previewDispatch, lastExecutePainlessRequestParams]
  );

  return { fetchSampleDocuments, loadDocument };
};
