/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';

import type { ControlValuesSource } from '@kbn/controls-constants';
import type { TypeOf } from '@kbn/config-schema';
import type { controlTitleSchema, dataControlSchema } from './control_schema';
import type {
  getControlsGroupSchema,
  controlWidthSchema,
  pinnedControlSchema,
} from './controls_group_schema';
import type {
  optionsListDSLControlSchema,
  optionsListESQLControlSchema,
  optionsListDisplaySettingsSchema,
  optionsListSearchTechniqueSchema,
  optionsListSelectionSchema,
  optionsListSortSchema,
} from './options_list_schema';
import type { rangeSliderControlSchema, rangeValueSchema } from './range_slider_schema';
import type { timeSliderControlSchema } from './time_slider_schema';

export type ControlsGroupState = TypeOf<ReturnType<typeof getControlsGroupSchema>>;
export type PinnedControlState = ControlsGroupState[number];
export type PinnedControlLayoutState = TypeOf<typeof pinnedControlSchema> & {
  order: number;
  type: string;
};

export type ControlWidth = TypeOf<typeof controlWidthSchema>;
export type ControlState = TypeOf<typeof controlTitleSchema>;

export type StrictDataControlState = TypeOf<typeof dataControlSchema>;

/**
 * Flat in-memory shape used by state managers and editors. Keys from both
 * `values_source` branches may coexist (for example, an ES|QL-source
 * control derives `data_view_id` and `field_name` from its query).
 */
export interface DataControlRuntimeState {
  title?: string;
  use_global_filters?: boolean;
  ignore_validations?: boolean;
  values_source?: ControlValuesSource;
  data_view_id?: string;
  field_name?: string;
  esql_query?: string;
}

export type OptionsListDisplaySettings = TypeOf<typeof optionsListDisplaySettingsSchema>;

export type StrictOptionsListDSLControlState = TypeOf<typeof optionsListDSLControlSchema>;

export type OptionsListDSLControlRuntimeState = DataControlRuntimeState & {
  display_settings?: OptionsListDisplaySettings;
  exclude?: boolean;
  exists_selected?: boolean;
  run_past_timeout?: boolean;
  search_technique?: OptionsListSearchTechnique;
  selected_options?: OptionsListSelection[];
  single_select?: boolean;
  sort?: OptionsListSortingType;
};

export type OptionsListESQLControlState = TypeOf<typeof optionsListESQLControlSchema>;
export type OptionsListControlState =
  | OptionsListDSLControlRuntimeState
  | OptionsListESQLControlState;

export type OptionsListSearchTechnique = TypeOf<typeof optionsListSearchTechniqueSchema>;
export type OptionsListSelection = TypeOf<typeof optionsListSelectionSchema>;
export type OptionsListSortingType = TypeOf<typeof optionsListSortSchema>;

export type StrictRangeSliderControlState = TypeOf<typeof rangeSliderControlSchema>;

export type RangeSliderControlRuntimeState = DataControlRuntimeState & {
  value?: RangeSliderValue;
  step?: number;
};

export type RangeSliderValue = TypeOf<typeof rangeValueSchema>;

export type TimeSlice = [number, number];
export type TimeSliderControlState = TypeOf<typeof timeSliderControlSchema>;

export interface HasCustomPrepend {
  CustomPrependComponent: React.FC<{}>;
}
