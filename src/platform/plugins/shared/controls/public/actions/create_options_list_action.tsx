/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { DEFAULT_DSL_OPTIONS_LIST_STATE, OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type { DataControlState, OptionsListControlState } from '@kbn/controls-schemas';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { isNumericType } from '@kbn/esql-language';
import { ControlValuesSource } from '@kbn/controls-constants';

import { OptionsListEditorOptions } from '../controls/data_controls/options_list_control/components/options_list_editor_options';
import { dataViewsService } from '../services/kibana_services';
import { OPTIONS_LIST_ACTION } from './constants';
import type { CreateControlTypeAction } from './control_panel_actions';
import { getESQLColumnType } from './get_esql_column_type';
import { createDataControlOfType } from './create_data_control_panel_action';

const isFieldCompatible = (field: DataViewField) => {
  return (
    !field.spec.scripted &&
    field.aggregatable &&
    ['string', 'boolean', 'ip', 'date', 'number'].includes(field.type)
  );
};

const isESQLColumnTypeCompatible = (columnType: string) =>
  ['keyword', 'text', 'ip', 'boolean', 'date', 'version'].includes(columnType) ||
  isNumericType(columnType);

export const createOptionsListControlAction = (): CreateControlTypeAction<
  OptionsListControlState & DataControlState
> => {
  return {
    id: OPTIONS_LIST_ACTION,
    type: OPTIONS_LIST_CONTROL,
    order: 1,
    getIconType: () => 'listCheck',
    getDisplayName: () =>
      i18n.translate('controls.optionsList.action.displayName', {
        defaultMessage: 'Options list',
      }),
    isCompatible: async ({
      embeddable,
      state: {
        data_view_id: dataViewId,
        field_name: fieldName,
        values_source: valuesSource,
        esql_query: esqlQuery,
      },
    }) => {
      // ES|QL columns can be computed by the query, so they don't need to exist in the data view
      if (valuesSource === ControlValuesSource.ESQL) {
        if (!esqlQuery || !fieldName) return false;
        const columnType = await getESQLColumnType(esqlQuery, embeddable);
        return Boolean(columnType) && isESQLColumnTypeCompatible(columnType as string);
      }
      if (!dataViewId || !fieldName) return false;
      const dataView = await dataViewsService.get(dataViewId);
      // ES|QL-source controls can sometimes pass a field name that omits a .keyword suffix, so try adding it before
      // declaring the field non-existent
      const field =
        dataView.getFieldByName(fieldName) ??
        (!fieldName.endsWith('.keyword')
          ? dataView.getFieldByName(`${fieldName}.keyword`)
          : undefined);
      return Boolean(field && isFieldCompatible(field));
    },
    execute: async ({ embeddable, state, controlId }) => {
      createDataControlOfType(OPTIONS_LIST_CONTROL, {
        embeddable,
        state: { ...DEFAULT_DSL_OPTIONS_LIST_STATE, ...state },
        controlId,
      });
    },
    extension: {
      CustomOptionsComponent: OptionsListEditorOptions,
      isFieldCompatible,
    },
  };
};
