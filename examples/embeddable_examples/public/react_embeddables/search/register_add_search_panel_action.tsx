/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ADD_SEARCH_ACTION_ID, SEARCH_EMBEDDABLE_ID } from './constants';

export const registerAddSearchPanelAction = (uiActions: UiActionsStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_SEARCH_ACTION_ID,
    getDisplayName: () => 'Unified search example',
    getDisplayNameTooltip: () =>
      'Demonstrates how to use global filters, global time range, panel time range, and global query state in an embeddable',
    getIconType: () => 'search',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel(
        {
          panelType: SEARCH_EMBEDDABLE_ID,
          initialState: {},
        },
        true
      );
    },
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_SEARCH_ACTION_ID);
};
