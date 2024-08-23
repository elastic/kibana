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
import {
  IncompatibleActionError,
  UiActionsStart,
  ADD_PANEL_TRIGGER,
} from '@kbn/ui-actions-plugin/public';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import { ADD_DATA_TABLE_ACTION_ID, DATA_TABLE_ID } from './constants';

// -----------------------------------------------------------------------------
// Create and register an action which allows this embeddable to be created from
// the dashboard toolbar context menu.
// -----------------------------------------------------------------------------
export const registerCreateDataTableAction = (uiActions: UiActionsStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_DATA_TABLE_ACTION_ID,
    grouping: [embeddableExamplesGrouping],
    getIconType: () => 'tableDensityNormal',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel(
        {
          panelType: DATA_TABLE_ID,
        },
        true
      );
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.dataTable.ariaLabel', {
        defaultMessage: 'Data table',
      }),
  });
  uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_DATA_TABLE_ACTION_ID);
};
