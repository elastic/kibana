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
import { PreviewState } from './types';
import { BehaviorObservable } from '../../state_utils';
import { EsDocument } from './types';

interface PreviewControllerDependencies {
  dataView: DataView;
  search: ISearchStart;
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
};

export class PreviewController {
  constructor({ dataView, search }: PreviewControllerDependencies) {
    this.dataView = dataView;
    this.search = search;

    this.internalState$ = new BehaviorSubject<PreviewState>({
      ...previewStateDefault,
    });

    this.state$ = this.internalState$ as BehaviorObservable<PreviewState>;
  }

  // @ts-ignore
  private dataView: DataView;
  // @ts-ignore
  private search: ISearchStart;
  private internalState$: BehaviorSubject<PreviewState>;
  state$: BehaviorObservable<PreviewState>;

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
}
