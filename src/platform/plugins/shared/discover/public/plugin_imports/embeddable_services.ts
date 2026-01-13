/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { EmbeddableEditorState, EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';

export { ViewSavedSearchAction } from '../embeddable/actions/view_saved_search_action';
export { getSearchEmbeddableFactory } from '../embeddable/get_search_embeddable_factory';
export { getLegacyLogStreamEmbeddableFactory } from '../embeddable/get_legacy_log_stream_embeddable_factory';
export { getSearchEmbeddableTransforms } from '../../common/embeddable';
export { addControlsFromSavedSession } from '../embeddable/utils/add_controls_from_saved_session';
export {
  SAVED_OBJECT_REF_NAME,
  apiPublishesEditablePauseFetch,
  apiHasUniqueId,
} from '@kbn/presentation-publishing';
export { apiPublishesESQLVariables } from '@kbn/esql-types';

export class EmbeddableEditorService {
  private embeddableState?: EmbeddableEditorState;

  constructor(
    private application: ApplicationStart,
    private embeddableStateTransfer: EmbeddableStateTransfer
  ) {
    this.embeddableState = embeddableStateTransfer.getIncomingEditorState('discover');
  }

  public isByValueEditor = (): boolean => {
    return !!this.embeddableState && !Boolean(this.embeddableState.searchSessionId);
  };

  public isEmbeddedEditor = (): boolean => {
    return !!this.embeddableState;
  };

  public transferBackToEditor = () => {
    if (this.embeddableState) {
      const app = this.embeddableState.originatingApp;
      const path = this.embeddableState.originatingPath;

      if (app && path) {
        this.embeddableStateTransfer.clearEditorState('discover');
        this.application.navigateToApp(app, { path });
      }
    }
  };
}
