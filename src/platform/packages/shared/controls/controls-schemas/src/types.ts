/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';

import type { TypeOf } from '@kbn/config-schema';
import type { controlSchema, dataControlSchema } from './control_schema';
import type { controlsGroupSchema } from './controls_group_schema';
import type {
  optionsListDSLControlSchema,
  optionsListESQLControlSchema,
  optionsListDisplaySettingsSchema,
  optionsListSearchTechniqueSchema,
  optionsListSelectionSchema,
  optionsListSortSchema,
} from './options_list_schema';
import type { rangeSliderControlSchema, rangeValueSchema } from './range_slider_schema';

export type ControlsGroupState = TypeOf<typeof controlsGroupSchema>;
export type StickyControlState = ControlsGroupState['controls'][number];
export type ControlState = TypeOf<typeof controlSchema>;

export type DataControlState = TypeOf<typeof dataControlSchema>;

export type OptionsListDisplaySettings = TypeOf<typeof optionsListDisplaySettingsSchema>;

export type OptionsListDSLControlState = TypeOf<typeof optionsListDSLControlSchema>;
export type OptionsListESQLControlState = TypeOf<typeof optionsListESQLControlSchema>;
export type OptionsListControlState = OptionsListDSLControlState | OptionsListESQLControlState;

export type OptionsListSearchTechnique = TypeOf<typeof optionsListSearchTechniqueSchema>;
export type OptionsListSelection = TypeOf<typeof optionsListSelectionSchema>;
export type OptionsListSortingType = TypeOf<typeof optionsListSortSchema>;

export type RangeSliderControlState = TypeOf<typeof rangeSliderControlSchema>;
export type RangeSliderValue = TypeOf<typeof rangeValueSchema>;

export type TimeSlice = [number, number];

export interface HasCustomPrepend {
  CustomPrependComponent: React.FC<{}>;
}
