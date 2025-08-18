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
import { apiPublishesDataViews, type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { openDataControlEditor } from '../controls/data_controls/open_data_control_editor';
import { ACTION_CREATE_CONTROL } from './constants';

export const createControlAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ACTION_CREATE_CONTROL,
  order: 0,
  getIconType: () => 'controlsHorizontal',
  isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    const parentDataViewId = apiPublishesDataViews(embeddable)
      ? embeddable.dataViews$.value?.[0]?.id
      : undefined;

    openDataControlEditor({
      initialState: {
        /** 
          TODO: We probably don't want to hardcode these - in the old version of controls,
          the last used values were persisted. Maybe we could use browser storage? :shrug:
        */
        grow: true,
        width: 'medium',
        dataViewId: parentDataViewId,
      },
      parentApi: embeddable,
    });
  },
  getDisplayName: () =>
    i18n.translate('optionsListcontrol.displayNameAriaLabel', {
      defaultMessage: 'Control',
    }),

  getDisplayNameTooltip: () =>
    i18n.translate('optionsListcontrol.tooltip', {
      defaultMessage: 'Add a control to your dashboard.',
    }),
});
