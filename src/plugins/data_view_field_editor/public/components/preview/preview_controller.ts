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
  // this needs to be renamed
  currentDocument: {
    isLoading: false,
    isCustomId: false,
  },
  /** sample documents fetched from cluster */
  documents: [],
  currentIdx: 0,
  documentSource: 'cluster',
  /** Keep track if the script painless syntax is being validated and if it is valid  */
  scriptEditorValidation: { isValidating: false, isValid: true, message: null },
};

export class PreviewController {
  constructor({ dataView, search }: PreviewControllerDependencies) {
    // this.dataView = dataView;
    // this.search = search;

    this.internalState$ = new BehaviorSubject<PreviewState>({
      ...previewStateDefault,
    });

    this.state$ = this.internalState$ as BehaviorObservable<PreviewState>;
  }

  // private dataView: DataView;
  // private search: ISearchStart;
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
      currentDocument: { /* value: documents[0], */ isLoading: false, isCustomId: false },
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
}
