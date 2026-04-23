/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  DiscoverSessionTab,
  SavedSearchByValueAttributes,
} from '@kbn/saved-search-plugin/common';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { EmbeddableEditorState, EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';
import type { SearchEmbeddableByReferenceState } from '../../common/embeddable/types';
import type { SearchEmbeddablePanelApiState } from '../embeddable/types';

/**
 * Specifies the action to be taken for navigating back to an editor.
 */
export enum TransferAction {
  /**
   * A Cancel operation. Returns to the editor without modifying the original state.
   */
  Cancel,
  /**
   * A Save Session operation. Updates the saved session and doesn't pass back any serialised state.
   */
  SaveSession,
  /**
   * A Save By Value operation. Sends the serialised embeddable attributes to the editor.
   */
  SaveByValue,
  /**
   * A Save By Reference operation. Sends a saved object reference to the editor.
   */
  SaveByReference,
}

interface TransferOptionsBase {
  path?: string;
  app?: string;
}

interface ByValueTransferOptions extends TransferOptionsBase {
  state: SavedSearchByValueAttributes;
}

interface ByReferenceTransferOptions extends TransferOptionsBase {
  state: SearchEmbeddableByReferenceState;
}

export class EmbeddableEditorService {
  private embeddableState?: EmbeddableEditorState;

  constructor(
    private embeddableStateTransfer: EmbeddableStateTransfer,
    private application: ApplicationStart
  ) {
    this.embeddableState = embeddableStateTransfer.getIncomingEditorState('discover', true);
  }

  public canSaveToDashboard = (): boolean =>
    !this.isEmbeddedEditor() &&
    Boolean(this.application.capabilities.dashboard_v2.show) &&
    Boolean(this.application.capabilities.dashboard_v2.createNew);

  public isByValueEditor = (): boolean => Boolean(this.embeddableState?.valueInput);

  public isEmbeddedEditor = (): boolean => Boolean(this.embeddableState);

  public getByValueInput = (): DiscoverSessionTab | undefined =>
    this.embeddableState?.valueInput as DiscoverSessionTab | undefined;

  /**
   * Resets the embeddable transfer state, ensuring it is cleared in storage and then dropped in memory.
   */
  public clearEditorState = () => {
    if (this.embeddableState) {
      this.embeddableStateTransfer.clearEditorState('discover');
      this.embeddableState = undefined;
    }
  };

  public transferBackToEditor(
    action: TransferAction.Cancel | TransferAction.SaveSession,
    options?: TransferOptionsBase
  ): void;
  public transferBackToEditor(
    action: TransferAction.SaveByValue,
    options: ByValueTransferOptions
  ): void;
  public transferBackToEditor(
    action: TransferAction.SaveByReference,
    options: ByReferenceTransferOptions
  ): void;
  /**
   * Initiates a navigation back to the editing application, either cancelling the current action to return
   * or passing a state for an embeddable to receive an updated view.
   *
   * **NOTE**: Cancelling will never pass an updated state, so the state param is ignored for cancel actions.
   */
  public transferBackToEditor(
    action: TransferAction,
    options?: TransferOptionsBase & {
      state?: SavedSearchByValueAttributes | SearchEmbeddableByReferenceState;
    }
  ) {
    const app = options?.app || this.embeddableState?.originatingApp;
    const path = options?.path || this.embeddableState?.originatingPath;
    const serializedState = this.getSerializedState(action, options);

    if (app && path) {
      this.embeddableStateTransfer.clearEditorState('discover');
      this.embeddableStateTransfer.navigateToWithEmbeddablePackages(app, {
        path,
        state:
          action !== TransferAction.Cancel
            ? [
                {
                  type: SEARCH_EMBEDDABLE_TYPE,
                  serializedState: serializedState ?? {},
                  embeddableId: this.embeddableState?.embeddableId,
                },
              ]
            : [],
      });
    }
  }

  private getSerializedState(
    action: TransferAction,
    options?: TransferOptionsBase & {
      state?: SavedSearchByValueAttributes | SearchEmbeddableByReferenceState;
    }
  ): SearchEmbeddablePanelApiState | undefined {
    if (action === TransferAction.SaveByValue) {
      const { state } = options as ByValueTransferOptions;
      return { attributes: state };
    }

    if (action === TransferAction.SaveByReference) {
      const { state } = options as ByReferenceTransferOptions;
      return { ref_id: state.savedObjectId, overrides: {} };
    }

    return undefined;
  }
}
