/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { BehaviorSubject } from 'rxjs';

import type { ControlValuesSource } from '@kbn/controls-constants';
import type { TypeOf } from '@kbn/config-schema';
import type { controlTitleSchema } from './control_schema';
import type {
  getControlsGroupSchema,
  controlWidthSchema,
  pinnedControlSchema,
} from './controls_group_schema';
import type {
  optionsListESQLControlSchema,
  optionsListDisplaySettingsSchema,
  optionsListSearchTechniqueSchema,
  optionsListSelectionSchema,
  optionsListSortSchema,
} from './options_list_schema';
import type { rangeValueSchema } from './range_slider_schema';
import type { timeSliderControlSchema } from './time_slider_schema';

export type ControlsGroupState = TypeOf<ReturnType<typeof getControlsGroupSchema>>;
export type PinnedControlState = ControlsGroupState[number];
export type PinnedControlLayoutState = TypeOf<typeof pinnedControlSchema> & {
  order: number;
  type: string;
};

export type ControlWidth = TypeOf<typeof controlWidthSchema>;
export type ControlState = TypeOf<typeof controlTitleSchema>;

interface DataControlBaseState {
  title?: string;
  use_global_filters: boolean;
  ignore_validations: boolean;
}

/** Validated field-sourced branch of {@link StrictDataControlState}. */
export type FieldDataControlState = DataControlBaseState & {
  values_source: ControlValuesSource.FIELD;
  data_view_id: string;
  field_name: string;
  esql_query?: never;
};

/** Validated ES|QL-sourced branch of {@link StrictDataControlState}. */
export type EsqlDataControlState = DataControlBaseState & {
  values_source: ControlValuesSource.ESQL;
  esql_query: string;
  data_view_id?: never;
  field_name?: never;
};

/** Schema-validated persisted data control state. */
export type StrictDataControlState = FieldDataControlState | EsqlDataControlState;

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

export type FieldOptionsListDSLControlState = FieldDataControlState & {
  display_settings?: OptionsListDisplaySettings;
  exclude?: boolean;
  exists_selected?: boolean;
  run_past_timeout?: boolean;
  search_technique?: OptionsListSearchTechnique;
  selected_options?: OptionsListSelection[];
  single_select?: boolean;
  sort?: OptionsListSortingType;
};

export type EsqlOptionsListDSLControlState = EsqlDataControlState & {
  display_settings?: OptionsListDisplaySettings;
  exclude?: boolean;
  exists_selected?: boolean;
  run_past_timeout?: boolean;
  search_technique?: OptionsListSearchTechnique;
  selected_options?: OptionsListSelection[];
  single_select?: boolean;
  sort?: OptionsListSortingType;
};

/** Schema-validated persisted options list control state. */
export type StrictOptionsListDSLControlState =
  | FieldOptionsListDSLControlState
  | EsqlOptionsListDSLControlState;

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

export type FieldRangeSliderControlState = FieldDataControlState & {
  value?: RangeSliderValue;
  step?: number;
};

export type EsqlRangeSliderControlState = EsqlDataControlState & {
  value?: RangeSliderValue;
  step?: number;
};

/** Schema-validated persisted range slider control state. */
export type StrictRangeSliderControlState =
  | FieldRangeSliderControlState
  | EsqlRangeSliderControlState;

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
export interface PublishesTooltipLabel {
  tooltipLabel$: BehaviorSubject<string>;
}

export const apiPublishesTooltipLabel = (api: unknown): api is PublishesTooltipLabel =>
  Boolean((api as PublishesTooltipLabel)?.tooltipLabel$);
