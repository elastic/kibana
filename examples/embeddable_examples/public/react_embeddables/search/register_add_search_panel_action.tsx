/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import { ADD_SEARCH_ACTION_ID, SEARCH_EMBEDDABLE_ID } from './constants';
import { SearchSerializedState } from './types';

export const registerAddSearchPanelAction = (uiActions: UiActionsStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_SEARCH_ACTION_ID,
    grouping: [embeddableExamplesGrouping],
    getDisplayName: () => 'Search example',
    getIconType: () => 'search',
    isCompatible: async ({ embeddable }) => {
      return apiCanAddNewPanel(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel<SearchSerializedState>(
        {
          panelType: SEARCH_EMBEDDABLE_ID,
        },
        true
      );
    },
  });
  uiActions.attachAction('ADD_PANEL_TRIGGER', ADD_SEARCH_ACTION_ID);
};
