/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type { DataControlState, OptionsListControlState } from '@kbn/controls-schemas';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';

import { OptionsListEditorOptions } from '../controls/data_controls/options_list_control/components/options_list_editor_options';
import { dataViewsService } from '../services/kibana_services';
import { OPTIONS_LIST_ACTION } from './constants';
import type { CreateControlTypeAction } from './control_panel_actions';
import { createDataControlOfType } from './create_data_control_panel_action';

const isFieldCompatible = (field: DataViewField) => {
  return (
    !field.spec.scripted &&
    field.aggregatable &&
    ['string', 'boolean', 'ip', 'date', 'number'].includes(field.type)
  );
};

export const createOptionsListControlAction = (): CreateControlTypeAction<
  OptionsListControlState & DataControlState
> => {
  return {
    id: OPTIONS_LIST_ACTION,
    type: OPTIONS_LIST_CONTROL,
    order: 1,
    getIconType: () => 'editorChecklist',
    getDisplayName: () =>
      i18n.translate('controls.optionsList.action.displayName', {
        defaultMessage: 'Options list',
      }),
    isCompatible: async ({ state: { data_view_id: dataViewId, field_name: fieldName } }) => {
      if (!dataViewId || !fieldName) return false;
      const dataView = await dataViewsService.get(dataViewId);
      const field = dataView.getFieldByName(fieldName);
      return Boolean(field && isFieldCompatible(field));
    },
    execute: async ({ embeddable, state, controlId, isPinned }) => {
      createDataControlOfType(OPTIONS_LIST_CONTROL, { embeddable, state, controlId, isPinned });
    },
    extension: {
      CustomOptionsComponent: OptionsListEditorOptions,
      isFieldCompatible,
    },
  };
};
