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
   * A Save By Value operation. Sends back to the editor the serialised updated state for the embeddable.
   */
  SaveByValue,
}

export class EmbeddableEditorService {
  private embeddableState?: EmbeddableEditorState;

  constructor(private embeddableStateTransfer: EmbeddableStateTransfer) {
    this.embeddableState = embeddableStateTransfer.getIncomingEditorState('discover', true);
  }

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

  public transferBackToEditor(action: TransferAction.Cancel | TransferAction.SaveSession): void;
  public transferBackToEditor(
    action: TransferAction.SaveByValue,
    state: SavedSearchByValueAttributes
  ): void;
  public transferBackToEditor(action: TransferAction, state?: SavedSearchByValueAttributes): void;
  /**
   * Initiates a navigation back to the editing application, either cancelling the current action to return
   * or passing a state for an embeddable to receive an updated view.
   *
   * **NOTE**: Cancelling will never pass an updated state, so the state param is ignored for cancel actions.
   */
  public transferBackToEditor(action: TransferAction, state?: SavedSearchByValueAttributes) {
    if (this.embeddableState) {
      const app = this.embeddableState.originatingApp;
      const path = this.embeddableState.originatingPath;

      if (app && path) {
        this.embeddableStateTransfer.clearEditorState('discover');
        this.embeddableStateTransfer.navigateToWithEmbeddablePackages(app, {
          path,
          state:
            action !== TransferAction.Cancel
              ? [
                  {
                    type: SEARCH_EMBEDDABLE_TYPE,
                    serializedState: { attributes: state },
                    embeddableId: this.embeddableState?.embeddableId,
                  },
                ]
              : [],
        });
      }
    }
  }
}
