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
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { ESQLControlState } from '@kbn/esql-types';
import { ESQLVariableType, EsqlControlType, apiPublishesESQLVariables } from '@kbn/esql-types';
import { ACTION_CREATE_ESQL_CONTROL } from './constants';
import { uiActionsService } from '../services/kibana_services';

export const createESQLControlAction = (): ActionDefinition<EmbeddableApiContext> => ({
  id: ACTION_CREATE_ESQL_CONTROL,
  order: 0,
  getIconType: () => 'controlsHorizontal',
  isCompatible: async ({ embeddable }) => apiCanAddNewPanel(embeddable),
  execute: async ({ embeddable }) => {
    if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
    const variablesInParent = apiPublishesESQLVariables(embeddable)
      ? embeddable.esqlVariables$.value
      : [];

    try {
      await uiActionsService.getTrigger('ESQL_CONTROL_TRIGGER').exec({
        queryString: '',
        variableType: ESQLVariableType.VALUES,
        controlType: EsqlControlType.VALUES_FROM_QUERY,
        esqlVariables: variablesInParent,
        onSaveControl: async (controlState: ESQLControlState) => {
          embeddable.addNewPanel({
            panelType: 'esqlControl',
            serializedState: {
              rawState: {
                ...controlState,
              },
            },
          });
        },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error getting ESQL control trigger', e);
    }
  },
  getDisplayName: () =>
    i18n.translate('controls.esqlControl.displayNameAriaLabel', {
      defaultMessage: 'ES|QL Control',
    }),

  getDisplayNameTooltip: () =>
    i18n.translate('controls.esqlControl.tooltip', {
      defaultMessage: 'Add an ES|QL control to your dashboard.',
    }),
});
