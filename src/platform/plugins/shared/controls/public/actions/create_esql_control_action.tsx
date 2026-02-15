/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel, apiCanPinPanels } from '@kbn/presentation-containers';
import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { ESQLControlState } from '@kbn/esql-types';
import {
  ControlTriggerSource,
  ESQLVariableType,
  EsqlControlType,
  apiPublishesESQLVariables,
} from '@kbn/esql-types';
import { ACTION_CREATE_ESQL_CONTROL } from '@kbn/controls-constants';
import { ADD_PANEL_CONTROL_GROUP } from './constants';
import { uiActionsService } from '../services/kibana_services';

export const createESQLControlAction = (): ActionDefinition<
  EmbeddableApiContext & { isPinned: boolean }
> => ({
  id: ACTION_CREATE_ESQL_CONTROL,
  order: 1,
  grouping: [ADD_PANEL_CONTROL_GROUP],
  getIconType: () => 'controlsHorizontal',
  isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable, isPinned }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    const variablesInParent = apiPublishesESQLVariables(embeddable)
      ? embeddable.esqlVariables$.value
      : [];

    try {
      await uiActionsService.executeTriggerActions('ESQL_CONTROL_TRIGGER', {
        queryString: '',
        variableType: ESQLVariableType.VALUES,
        controlType: EsqlControlType.VALUES_FROM_QUERY,
        esqlVariables: variablesInParent,
        onSaveControl: async (controlState: ESQLControlState) => {
          const newControl = {
            panelType: 'esqlControl',
            serializedState: {
              ...controlState,
            },
          };

          // add a new control as either pinned or not depending on provided context
          (isPinned && apiCanPinPanels(embeddable)
            ? embeddable.addPinnedPanel
            : embeddable.addNewPanel)(newControl, { displaySuccessMessage: true });
        },
        triggerSource: ControlTriggerSource.ADD_CONTROL_BTN,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error getting ESQL control trigger', e);
    }
  },
  getDisplayName: () =>
    i18n.translate('controls.esqlControl.displayNameAriaLabel', {
      defaultMessage: 'Variable control',
    }),

  getDisplayNameTooltip: () =>
    i18n.translate('controls.esqlControl.tooltip', {
      defaultMessage: 'Add a variable control to your dashboard.',
    }),
});
