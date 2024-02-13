/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { ADD_FIELD_LIST_ACTION_ID, FIELD_LIST_ID } from './constants';

export const registerCreateFieldListAction = (uiActions: UiActionsPublicStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_FIELD_LIST_ACTION_ID,
    getIconType: () => 'indexOpen',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel({
        panelType: FIELD_LIST_ID,
      });
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.unifiedFieldList.displayName', {
        defaultMessage: 'Field list',
      }),
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_FIELD_LIST_ACTION_ID);
};
