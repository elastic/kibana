/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import type { OptionsListControlState } from '../../common/options_list';
import { OptionsListEditorOptions } from '../controls/data_controls/options_list_control/components/options_list_editor_options';
import type { OptionsListControlApi } from '../controls/data_controls/options_list_control/types';
import { dataViewsService } from '../services/kibana_services';
import { OPTIONS_LIST_ACTION } from './constants';
import type { ControlTypeAction } from './control_panel_actions';

export const createOptionsListControlAction = (): ControlTypeAction<OptionsListControlState> => {
  const isFieldCompatible = (field: DataViewField) => {
    return (
      !field.spec.scripted &&
      field.aggregatable &&
      ['string', 'boolean', 'ip', 'date', 'number'].includes(field.type)
    );
  };
  return {
    id: OPTIONS_LIST_ACTION,
    type: OPTIONS_LIST_CONTROL,
    order: 0,
    getIconType: () => 'editorChecklist',
    getDisplayName: () =>
      i18n.translate('controls.optionsList.displayName', {
        defaultMessage: 'Options list',
      }),
    isCompatible: async ({ state: { dataViewId, fieldName } }) => {
      if (!dataViewId || !fieldName) return false;
      const dataView = await dataViewsService.get(dataViewId);
      const field = dataView.getFieldByName(fieldName);
      return Boolean(field && isFieldCompatible(field));
    },
    execute: async ({ embeddable, state, controlId }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      if (controlId) {
        embeddable.replacePanel(controlId, {
          panelType: OPTIONS_LIST_CONTROL,
          serializedState: {
            rawState: state,
          },
        });
      } else {
        embeddable.addNewPanel<OptionsListControlState, OptionsListControlApi>(
          {
            panelType: OPTIONS_LIST_CONTROL,
            serializedState: {
              rawState: state,
            },
          },
          true
        );
      }
    },
    extension: {
      CustomOptionsComponent: OptionsListEditorOptions,
      isFieldCompatible,
    },
  };
};
