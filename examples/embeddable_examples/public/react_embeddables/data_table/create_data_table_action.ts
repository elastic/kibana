/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import { ADD_DATA_TABLE_ACTION_ID, DATA_TABLE_ID } from './constants';

// -----------------------------------------------------------------------------
// Create and register an action which allows this embeddable to be created from
// the dashboard toolbar context menu.
// -----------------------------------------------------------------------------

export const createDataTableAction = {
  id: ADD_DATA_TABLE_ACTION_ID,
  grouping: [embeddableExamplesGrouping],
  getIconType: () => 'tableDensityNormal',
  isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
    return apiIsPresentationContainer(embeddable);
  },
  execute: async ({ embeddable }: EmbeddableApiContext) => {
    if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
    embeddable.addNewPanel(
      {
        panelType: DATA_TABLE_ID,
      },
      {
        displaySuccessMessage: true,
      }
    );
  },
  getDisplayName: () =>
    i18n.translate('embeddableExamples.dataTable.ariaLabel', {
      defaultMessage: 'Data table',
    }),
};
