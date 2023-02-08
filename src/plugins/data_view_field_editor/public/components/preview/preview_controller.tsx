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
import { PreviewState } from './types';
import { BehaviorObservable } from '../../state_utils';
import { EsDocument, ScriptErrorCodes, Params } from './types';
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

  private state: PreviewState = previewStateDefault;
  private internalState$: BehaviorSubject<PreviewState>;
  state$: BehaviorObservable<PreviewState>;

  private updateState = (newState: Partial<PreviewState>) => {
    this.state = { ...this.state, ...newState };
    this.publishState();
  };

  private publishState = () => {
    // todo try removing object copy
    this.internalState$.next({ ...this.state });
  };

  togglePinnedField = (fieldName: string) => {
    const pinnedFields = {
      ...this.state.pinnedFields,
      [fieldName]: !this.state.pinnedFields[fieldName],
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
    if (this.state.currentIdx >= this.state.documents.length - 1) {
      this.updateState({ currentIdx: 0 });
    } else {
      this.updateState({ currentIdx: this.state.currentIdx + 1 });
    }
  };

  goToPreviousDocument = () => {
    if (this.state.currentIdx === 0) {
      this.updateState({ currentIdx: this.state.documents.length - 1 });
    } else {
      this.updateState({ currentIdx: this.state.currentIdx - 1 });
    }
  };

  setScriptEditorValidation = (scriptEditorValidation: PreviewState['scriptEditorValidation']) => {
    this.updateState({ scriptEditorValidation });
  };

  setCustomId = (customId?: string) => {
    this.updateState({ customId });
  };

  setPreviewError = (error: PreviewState['previewResponse']['error']) => {
    this.updateState({ previewResponse: { ...this.state.previewResponse, error } });
  };

  setPreviewResponse = (previewResponse: PreviewState['previewResponse']) => {
    this.updateState({ previewResponse });
  };

  clearPreviewError = (errorCode: ScriptErrorCodes) => {
    const { previewResponse: prev } = this.state;
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
}
