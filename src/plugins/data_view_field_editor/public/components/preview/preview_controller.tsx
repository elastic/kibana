/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { renderToString } from '@kbn/react-to-string';
import React from 'react';
import debounce from 'lodash/debounce';
import { PreviewState, FetchDocError } from './types';
import { BehaviorObservable } from '../../state_utils';
import { EsDocument, ScriptErrorCodes, Params, FieldPreview } from './types';
import type { FieldFormatsStart } from '../../shared_imports';
import { valueTypeToSelectedType } from './field_preview_context';

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
  /** Possible error while fetching sample documents */
  fetchDocError: null,
  /** Flag to indicate if we are loading a single document by providing its ID */
  customDocIdToLoad: null, // not used externally
  // We keep in cache the latest params sent to the _execute API so we don't make unecessary requests
  // when changing parameters that don't affect the preview result (e.g. changing the "name" field).

  isLoadingPreview: false,
  initialPreviewComplete: false,
  isPreviewAvailable: true,
  /** Flag to show/hide the preview panel */
  isPanelVisible: true,
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

    this.fetchSampleDocuments();
  }

  // dependencies
  private dataView: DataView;
  private search: ISearchStart;
  private fieldFormats: FieldFormatsStart;

  private internalState$: BehaviorSubject<PreviewState>;
  state$: BehaviorObservable<PreviewState>;

  private previewCount = 0;

  private updateState = (newState: Partial<PreviewState>) => {
    this.internalState$.next({ ...this.state$.getValue(), ...newState });
  };

  private lastExecutePainlessRequestParams: {
    type: Params['type'];
    script: string | undefined;
    documentId: string | undefined;
  } = {
    type: null,
    script: undefined,
    documentId: undefined,
  };

  togglePinnedField = (fieldName: string) => {
    const currentState = this.state$.getValue();
    const pinnedFields = {
      ...currentState.pinnedFields,
      [fieldName]: !currentState.pinnedFields[fieldName],
    };

    this.updateState({ pinnedFields });
  };

  private setDocuments = (documents: EsDocument[]) => {
    this.updateState({
      documents,
      currentIdx: 0,
      isLoadingDocuments: false,
      isPreviewAvailable: this.getIsPreviewAvailable({ documents }),
    });
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

  /* disabled while investigating issues with painless script editor
  setScriptEditorValidation = (scriptEditorValidation: PreviewState['scriptEditorValidation']) => {
    this.updateState({ scriptEditorValidation });
  };
  */

  setPreviewError = (error: PreviewState['previewResponse']['error']) => {
    this.updateState({
      previewResponse: { ...this.internalState$.getValue().previewResponse, error },
    });
  };

  setPreviewResponse = (previewResponse: PreviewState['previewResponse']) => {
    this.updateState({ previewResponse });
  };

  setCustomDocIdToLoad = (customDocIdToLoad: string | null) => {
    this.updateState({
      customDocIdToLoad,
      customId: customDocIdToLoad || undefined,
      isPreviewAvailable: this.getIsPreviewAvailable({ customDocIdToLoad }),
    });
    // load document if id is present
    this.setIsFetchingDocument(!!customDocIdToLoad);
    if (customDocIdToLoad) {
      this.debouncedLoadDocument(customDocIdToLoad);
    }
  };

  // If no documents could be fetched from the cluster (and we are not trying to load
  // a custom doc ID) then we disable preview as the script field validation expect the result
  // of the preview to before resolving. If there are no documents we can't have a preview
  // (the _execute API expects one) and thus the validation should not expect a value.

  private getIsPreviewAvailable = (update: {
    isFetchingDocument?: boolean;
    customDocIdToLoad?: string | null;
    documents?: EsDocument[];
  }) => {
    const {
      isFetchingDocument: existingIsFetchingDocument,
      customDocIdToLoad: existingCustomDocIdToLoad,
      documents: existingDocuments,
    } = this.internalState$.getValue();

    const existing = { existingIsFetchingDocument, existingCustomDocIdToLoad, existingDocuments };

    const merged = { ...existing, ...update };

    if (!merged.isFetchingDocument && !merged.customDocIdToLoad && merged.documents?.length === 0) {
      return false;
    } else {
      return true;
    }
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

  private setIsFetchingDocument = (isFetchingDocument: boolean) => {
    this.updateState({
      isFetchingDocument,
      isPreviewAvailable: this.getIsPreviewAvailable({ isFetchingDocument }),
    });
  };

  private setFetchDocError = (fetchDocError: FetchDocError | null) => {
    this.updateState({ fetchDocError });
  };

  setIsLoadingPreview = (isLoadingPreview: boolean) => {
    this.updateState({ isLoadingPreview });
  };

  setInitialPreviewComplete = (initialPreviewComplete: boolean) => {
    this.updateState({ initialPreviewComplete });
  };

  getIsFirstDoc = () => this.internalState$.getValue().currentIdx === 0;

  getIsLastDoc = () => {
    const { currentIdx, documents } = this.internalState$.getValue();
    return currentIdx >= documents.length - 1;
  };

  setLastExecutePainlessRequestParams = (
    lastExecutePainlessRequestParams: Partial<typeof this.lastExecutePainlessRequestParams>
  ) => {
    const state = this.internalState$.getValue();
    const currentDocument = state.documents[state.currentIdx];
    const updated = {
      ...this.lastExecutePainlessRequestParams,
      ...lastExecutePainlessRequestParams,
    };

    if (
      this.allParamsDefined(
        updated.type,
        updated.script,
        // todo get current doc index
        currentDocument?._index
      ) &&
      this.hasSomeParamsChanged(
        lastExecutePainlessRequestParams.type!,
        lastExecutePainlessRequestParams.script,
        lastExecutePainlessRequestParams.documentId
      )
    ) {
      /**
       * In order to immediately display the "Updating..." state indicator and not have to wait
       * the 500ms of the debounce, we set the isLoadingPreview state in this effect whenever
       * one of the _execute API param changes
       */
      this.setIsLoadingPreview(true);
    }
    this.lastExecutePainlessRequestParams = updated;
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

  fetchSampleDocuments = async (limit: number = 50) => {
    if (typeof limit !== 'number') {
      // We guard ourself from passing an <input /> event accidentally
      throw new Error('The "limit" option must be a number');
    }

    this.setLastExecutePainlessRequestParams({ documentId: undefined });
    this.setIsFetchingDocument(true);
    this.setPreviewResponse({ fields: [], error: null });

    const [response, searchError] = await this.search
      .search({
        params: {
          index: this.dataView.getIndexPattern(),
          body: {
            fields: ['*'],
            size: limit,
          },
        },
      })
      .toPromise()
      .then((res) => [res, null])
      .catch((err) => [null, err]);

    this.setIsFetchingDocument(false);
    this.setCustomDocIdToLoad(null);

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

    this.setLastExecutePainlessRequestParams({ documentId: undefined });
    this.setIsFetchingDocument(true);

    const [response, searchError] = await this.search
      .search({
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
      .toPromise()
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

  debouncedLoadDocument = debounce(this.loadDocument, 500, { leading: true });

  reset = () => {
    this.previewCount = 0;
    this.updateState({
      documents: [],
      previewResponse: { fields: [], error: null },
      isLoadingPreview: false,
      isFetchingDocument: false,
    });
  };

  hasSomeParamsChanged = (
    type: Params['type'],
    script: string | undefined,
    currentDocId: string | undefined
  ) => {
    return (
      this.lastExecutePainlessRequestParams.type !== type ||
      this.lastExecutePainlessRequestParams.script !== script ||
      this.lastExecutePainlessRequestParams.documentId !== currentDocId
    );
  };

  getPreviewCount = () => this.previewCount;

  incrementPreviewCount = () => ++this.previewCount;

  allParamsDefined = (
    type: Params['type'],
    script: string | undefined,
    currentDocIndex: string
  ) => {
    if (!currentDocIndex || !script || !type) {
      return false;
    }
    return true;
  };

  updateSingleFieldPreview = (
    fieldName: string,
    values: unknown[],
    type: Params['type'],
    format: Params['format']
  ) => {
    const [value] = values;
    const formattedValue = this.valueFormatter({ value, type, format });

    this.setPreviewResponse({
      fields: [{ key: fieldName, value, formattedValue }],
      error: null,
    });
  };

  updateCompositeFieldPreview = (
    compositeValues: Record<string, unknown[]>,
    parentName: string | null,
    name: string,
    fieldName$Value: string,
    type: Params['type'],
    format: Params['format'],
    onNext: (fields: FieldPreview[]) => void
  ) => {
    const updatedFieldsInScript: string[] = [];
    // if we're displaying a composite subfield, filter results
    const filterSubfield = parentName ? (field: FieldPreview) => field.key === name : () => true;

    const fields = Object.entries(compositeValues)
      .map<FieldPreview>(([key, values]) => {
        // The Painless _execute API returns the composite field values under a map.
        // Each of the key is prefixed with "composite_field." (e.g. "composite_field.field1: ['value']")
        const { 1: fieldName } = key.split('composite_field.');
        updatedFieldsInScript.push(fieldName);

        const [value] = values;
        const formattedValue = this.valueFormatter({ value, type, format });

        return {
          key: parentName
            ? `${parentName ?? ''}.${fieldName}`
            : `${fieldName$Value ?? ''}.${fieldName}`,
          value,
          formattedValue,
          type: valueTypeToSelectedType(value),
        };
      })
      .filter(filterSubfield)
      // ...and sort alphabetically
      .sort((a, b) => a.key.localeCompare(b.key));

    onNext(fields);
    this.setPreviewResponse({
      fields,
      error: null,
    });
  };
}
