/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { RangeSliderControlState } from '@kbn/controls-schemas';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';

import { RangeSliderEditorOptions } from '../controls/data_controls/range_slider/components/editor/range_slider_editor_options';
import { dataViewsService } from '../services/kibana_services';
import { RANGE_SLIDER_ACTION } from './constants';
import type { CreateControlTypeAction } from './control_panel_actions';
import { createDataControlOfType } from './create_data_control_panel_action';

const isFieldCompatible = (field: DataViewField) => {
  return field.aggregatable && field.type === 'number';
};

export const createRangeSliderControlAction =
  (): CreateControlTypeAction<RangeSliderControlState> => {
    return {
      id: RANGE_SLIDER_ACTION,
      type: RANGE_SLIDER_CONTROL,
      order: 0,
      getIconType: () => 'controlsHorizontal',
      getDisplayName: () =>
        i18n.translate('controls.rangeSlider.displayName', {
          defaultMessage: 'Range slider',
        }),
      isCompatible: async ({ state: { data_view_id: dataViewId, field_name: fieldName } }) => {
        if (!dataViewId || !fieldName) return false;
        const dataView = await dataViewsService.get(dataViewId);
        const field = dataView.getFieldByName(fieldName);
        return Boolean(field && isFieldCompatible(field));
      },
      execute: async ({ embeddable, state, controlId, isPinned }) => {
        createDataControlOfType(RANGE_SLIDER_CONTROL, { embeddable, state, controlId, isPinned });
      },
      extension: {
        CustomOptionsComponent: RangeSliderEditorOptions,
        isFieldCompatible,
      },
    };
  };
