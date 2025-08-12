/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ADD_OPTIONS_LIST_ACTION_ID } from './constants';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import { OptionsListControlState } from '@kbn/controls-plugin/common/options_list';
import { OptionsListEmbeddableApi } from '../controls/data_controls/options_list_control/options_list_embeddable_factory';

export const createOptionsListAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ADD_OPTIONS_LIST_ACTION_ID,
  order: 0,
  getIconType: () => 'editorChecklist',
  isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    embeddable.addNewPanel<OptionsListControlState, OptionsListEmbeddableApi>(
      {
        panelType: OPTIONS_LIST_CONTROL,
        serializedState: {
          rawState: {
            dataViewId: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
            fieldName: 'Carrier',
          },
        },
      },
      true
    );
  },
  getDisplayName: () =>
    i18n.translate('optionsListcontrol.displayNameAriaLabel', {
      defaultMessage: 'Options list control',
    }),

  getDisplayNameTooltip: () =>
    i18n.translate('optionsListcontrol.tooltip', {
      defaultMessage: 'Add an options list control.',
    }),
});
