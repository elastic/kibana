/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ApplicationStart } from '@kbn/core/public';
import type {
  DiscoverSessionTab,
  SavedSearchByValueAttributes,
} from '@kbn/saved-search-plugin/common';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { EmbeddableEditorState, EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';

export class EmbeddableEditorService {
  private embeddableState?: EmbeddableEditorState;

  constructor(
    private application: ApplicationStart,
    private embeddableStateTransfer: EmbeddableStateTransfer
  ) {
    this.embeddableState = embeddableStateTransfer.getIncomingEditorState('discover', true);
  }

  public isByValueEditor = (): boolean => Boolean(this.embeddableState?.valueInput);

  public isEmbeddedEditor = (): boolean => Boolean(this.embeddableState);

  public getByValueInput = (): DiscoverSessionTab | undefined =>
    this.embeddableState?.valueInput as DiscoverSessionTab | undefined;

  public transferBackToEditor = (state?: SavedSearchByValueAttributes) => {
    if (this.embeddableState) {
      const app = this.embeddableState.originatingApp;
      const path = this.embeddableState.originatingPath;

      if (app && path) {
        this.embeddableStateTransfer.clearEditorState('discover');
        if (state) {
          this.embeddableStateTransfer.navigateToWithEmbeddablePackages(app, {
            path,
            state: [
              {
                type: SEARCH_EMBEDDABLE_TYPE,
                serializedState: { attributes: state },
                embeddableId: this.embeddableState?.embeddableId,
              },
            ],
          });
        } else {
          this.application.navigateToApp(app, {
            path,
          });
        }
      }
    }
  };
}
