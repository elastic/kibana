/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { firstValueFrom } from 'rxjs';
import { PreviewState } from './types';
import { BehaviorObservable } from '../../state_utils';
import { EsDocument, ScriptErrorCodes, Params, FetchDocError } from './types';
import type { FieldFormatsStart } from '../../shared_imports';

export const defaultValueFormatter = (value: unknown) => {
  const content = typeof value === 'object' ? JSON.stringify(value) : String(value) ?? '-';
  return renderToString(<>{content}</>);
};

interface PreviewControllerDependencies {
  dataView: DataView;
  search: ISearchStart;
  fieldFormats: FieldFormatsStart;
}

const previewStateDefault: PreviewState = {
  /** Map of fields pinned to the top of the list */
  pinnedFields: {},
  isLoadingDocuments: true,
  /** Flag to indicate if we are loading a single document by providing its ID */
  customId: undefined,
  /** sample documents fetched from cluster */
  documents: [],
  currentIdx: 0,
  documentSource: 'cluster',
  /** Keep track if the script painless syntax is being validated and if it is valid  */
  scriptEditorValidation: { isValidating: false, isValid: true, message: null },
  previewResponse: { fields: [], error: null },
  /** Flag to indicate if we are loading document from cluster */
  isFetchingDocument: false,
  /** Flag to indicate if we are loading a single document by providing its ID */
  customDocIdToLoad: null,
  fetchDocError: null,
  isLoadingPreview: false,
};

export class PreviewController {
  constructor({ dataView, search, fieldFormats }: PreviewControllerDependencies) {
    this.dataView = dataView;
    this.search = search;
    this.fieldFormats = fieldFormats;

    this.internalState$ = new BehaviorSubject<PreviewState>({
      ...previewStateDefault,
    });

    this.state$ = this.internalState$ as BehaviorObservable<PreviewState>;
  }

  // dependencies
  // @ts-ignore
  private dataView: DataView;
  // @ts-ignore
  private search: ISearchStart;
  private fieldFormats: FieldFormatsStart;

  private internalState$: BehaviorSubject<PreviewState>;
  state$: BehaviorObservable<PreviewState>;

  // We keep in cache the latest params sent to the _execute API so we don't make unecessary requests
  // when changing parameters that don't affect the preview result (e.g. changing the "name" field).
  lastExecutePainlessRequestParams: {
    type: Params['type'];
    script: string | undefined;
    documentId: string | undefined;
  } = {
    type: null,
    script: undefined,
    documentId: undefined,
  };

  previewCount = 0;

  private updateState = (newState: Partial<PreviewState>) => {
    this.internalState$.next({ ...this.state$.getValue(), ...newState });
  };

  togglePinnedField = (fieldName: string) => {
    const currentState = this.state$.getValue();
    const pinnedFields = {
      ...currentState.pinnedFields,
      [fieldName]: !currentState.pinnedFields[fieldName],
    };

    this.updateState({ pinnedFields });
  };

  setDocuments = (documents: EsDocument[]) => {
    this.updateState({
      documents,
      currentIdx: 0,
      isLoadingDocuments: false,
    });
  };

  setCurrentIdx = (currentIdx: number) => {
    this.updateState({ currentIdx });
  };

  goToNextDocument = () => {
    const currentState = this.state$.getValue();
    if (currentState.currentIdx >= currentState.documents.length - 1) {
      this.updateState({ currentIdx: 0 });
    } else {
      this.updateState({ currentIdx: currentState.currentIdx + 1 });
    }
  };

  goToPreviousDocument = () => {
    const currentState = this.state$.getValue();
    if (currentState.currentIdx === 0) {
      this.updateState({ currentIdx: currentState.documents.length - 1 });
    } else {
      this.updateState({ currentIdx: currentState.currentIdx - 1 });
    }
  };

  setScriptEditorValidation = (scriptEditorValidation: PreviewState['scriptEditorValidation']) => {
    this.updateState({ scriptEditorValidation });
  };

  setCustomId = (customId?: string) => {
    this.updateState({ customId });
  };

  setPreviewError = (error: PreviewState['previewResponse']['error']) => {
    this.updateState({
      previewResponse: { ...this.internalState$.getValue().previewResponse, error },
    });
  };

  setPreviewResponse = (previewResponse: PreviewState['previewResponse']) => {
    this.updateState({ previewResponse });
  };

  clearPreviewError = (errorCode: ScriptErrorCodes) => {
    const { previewResponse: prev } = this.internalState$.getValue();
    const error = prev.error === null || prev.error?.code === errorCode ? null : prev.error;
    this.updateState({
      previewResponse: {
        ...prev,
        error,
      },
    });
  };

  valueFormatter = ({
    value,
    format,
    type,
  }: {
    value: unknown;
    format: Params['format'];
    type: Params['type'];
  }) => {
    if (format?.id) {
      const formatter = this.fieldFormats.getInstance(format.id, format.params);
      if (formatter) {
        return formatter.getConverterFor('html')(value) ?? JSON.stringify(value);
      }
    }

    if (type) {
      const fieldType = castEsToKbnFieldTypeName(type);
      const defaultFormatterForType = this.fieldFormats.getDefaultInstance(fieldType);
      if (defaultFormatterForType) {
        return defaultFormatterForType.getConverterFor('html')(value) ?? JSON.stringify(value);
      }
    }

    return defaultValueFormatter(value);
  };

  setIsFetchingDocument = (isFetchingDocument: boolean) => {
    this.updateState({ isFetchingDocument });
  };

  setCustomDocIdToLoad = (customDocIdToLoad: string | null) => {
    this.updateState({ customDocIdToLoad });
  };

  setFetchDocError = (fetchDocError: FetchDocError | null) => {
    this.updateState({ fetchDocError });
  };

  setIsLoadingPreview = (isLoadingPreview: boolean) => {
    this.updateState({ isLoadingPreview });
  };

  fetchSampleDocuments = async (limit: number = 50) => {
    if (typeof limit !== 'number') {
      // We guard ourself from passing an <input /> event accidentally
      throw new Error('The "limit" option must be a number');
    }

    this.lastExecutePainlessRequestParams.documentId = undefined;
    // todo
    this.updateState({ isFetchingDocument: true, previewResponse: { fields: [], error: null } });

    const [response, searchError] = await firstValueFrom(
      this.search.search({
        params: {
          index: this.dataView.getIndexPattern(),
          body: {
            fields: ['*'],
            size: limit,
          },
        },
      })
    )
      .then((res) => [res, null])
      .catch((err) => [null, err]);

    // todo
    this.updateState({ isFetchingDocument: false, customDocIdToLoad: null });

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

    this.setFetchDocError(error);

    if (error === null) {
      this.setDocuments(response ? response.rawResponse.hits.hits : []);
    }
  };

  loadDocument = async (id: string) => {
    if (!Boolean(id.trim())) {
      return;
    }

    this.lastExecutePainlessRequestParams.documentId = undefined;
    this.setIsFetchingDocument(true);

    const [response, searchError] = await firstValueFrom(
      this.search.search({
        params: {
          index: this.dataView.getIndexPattern(),
          body: {
            size: 1,
            fields: ['*'],
            query: {
              ids: {
                values: [id],
              },
            },
          },
        },
      })
    )
      .then((res) => [res, null])
      .catch((err) => [null, err]);

    this.setIsFetchingDocument(false);

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

    this.setFetchDocError(error);

    if (error === null) {
      this.setDocuments(loadedDocuments);
    } else {
      // Make sure we disable the "Updating..." indicator as we have an error
      // and we won't fetch the preview
      this.setIsLoadingPreview(false);
    }
  };

  reset = () => {
    // By resetting the previewCount we will discard previous inflight
    // API call response coming in after calling reset() was called
    this.previewCount = 0;

    this.updateState({
      documents: [],
      previewResponse: { fields: [], error: null },
      isLoadingPreview: false,
      isFetchingDocument: false,
    });
  };
}
