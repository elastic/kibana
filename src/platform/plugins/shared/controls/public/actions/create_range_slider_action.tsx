/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { DataViewField } from '@kbn/data-views-plugin/common';

import type { RangeSliderControlState } from '@kbn/controls-schemas';
import { dataViewsService } from '../services/kibana_services';
import { RANGE_SLIDER_ACTION } from './constants';
import type { CreateControlTypeAction } from './control_panel_actions';
import { createDataControlOfType } from './create_control_action';
import { RangeSliderEditorOptions } from '../controls/data_controls/range_slider/components/editor/range_slider_editor_options';
import { RangeSliderStrings } from '../controls/data_controls/range_slider/range_slider_strings';

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
      getDisplayName: RangeSliderStrings.control.getDisplayName,
      isCompatible: async ({ state: { dataViewId, fieldName } }) => {
        if (!dataViewId || !fieldName) return false;
        const dataView = await dataViewsService.get(dataViewId);
        const field = dataView.getFieldByName(fieldName);
        return Boolean(field && isFieldCompatible(field));
      },
      execute: async ({ embeddable, state, controlId }) => {
        createDataControlOfType(RANGE_SLIDER_CONTROL, { embeddable, state, controlId });
      },
      extension: {
        CustomOptionsComponent: RangeSliderEditorOptions,
        isFieldCompatible,
      },
    };
  };
