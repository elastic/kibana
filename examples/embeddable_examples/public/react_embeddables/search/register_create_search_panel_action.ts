/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type UiActionsStart, ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { SearchSerializedState } from './types';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import { ADD_SEARCH_ACTION_ID, SEARCH_EMBEDDABLE_TYPE } from './constants';

const createSearchPanelAction = {
  id: ADD_SEARCH_ACTION_ID,
  grouping: [embeddableExamplesGrouping],
  getDisplayName: () => 'Search example',
  getIconType: () => 'search',
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    return apiCanAddNewPanel(embeddable);
  },
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    embeddable.addNewPanel<SearchSerializedState>(
      {
        panelType: SEARCH_EMBEDDABLE_TYPE,
      },
      true
    );
  },
};

export const registerCreateSearchPanelAction = (uiActions: UiActionsStart) => {
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_SEARCH_ACTION_ID, async () => {
    return createSearchPanelAction;
  });
};
