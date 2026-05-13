/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';

import type { z } from '@kbn/zod';
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

export type ControlsGroupState = z.output<ReturnType<typeof getControlsGroupSchema>>;
export type PinnedControlState = ControlsGroupState[number];
export type PinnedControlLayoutState = z.output<typeof pinnedControlSchema> & {
  order: number;
  type: string;
};

export type ControlWidth = z.output<typeof controlWidthSchema>;
export type ControlState = z.output<typeof controlTitleSchema>;

export type DataControlState = z.output<typeof dataControlSchema>;

export type OptionsListDisplaySettings = z.output<typeof optionsListDisplaySettingsSchema>;

export type OptionsListDSLControlState = z.output<typeof optionsListDSLControlSchema>;
export type OptionsListESQLControlState = z.output<typeof optionsListESQLControlSchema>;
export type OptionsListControlState = OptionsListDSLControlState | OptionsListESQLControlState;

export type OptionsListSearchTechnique = z.output<typeof optionsListSearchTechniqueSchema>;
export type OptionsListSelection = z.output<typeof optionsListSelectionSchema>;
export type OptionsListSortingType = z.output<typeof optionsListSortSchema>;

export type RangeSliderControlState = z.output<typeof rangeSliderControlSchema>;
export type RangeSliderValue = z.output<typeof rangeValueSchema>;

export type TimeSlice = [number, number];
export type TimeSliderControlState = z.output<typeof timeSliderControlSchema>;

export interface HasCustomPrepend {
  CustomPrependComponent: React.FC<{}>;
}
