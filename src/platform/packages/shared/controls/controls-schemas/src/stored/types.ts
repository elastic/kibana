/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { storedDataControlSchema } from './stored_control_schema';
import type {
  storedOptionsListDSLControlSchema,
  storedOptionsListESQLControlSchema,
} from './stored_options_list_schema';
import type { storedPinnedControlSchema } from './stored_pinned_controls_schema';
import type { storedRangeSliderControlSchema } from './stored_range_slider_schema';
import type { storedTimeSliderControlSchema } from './stored_time_slider_schema';

export type StoredDataControlState = TypeOf<typeof storedDataControlSchema>;

export type StoredPinnedControlState = TypeOf<typeof storedPinnedControlSchema>;
export interface StoredPinnedControls {
  [id: string]: StoredPinnedControlState;
}

export type StoredOptionsListExplicitInput = TypeOf<typeof storedOptionsListDSLControlSchema>;
export type StoredESQLControlExplicitInput = TypeOf<typeof storedOptionsListESQLControlSchema>;
export type StoredRangeSliderExplicitInput = TypeOf<typeof storedRangeSliderControlSchema>;
export type StoredTimeSliderExplicitInput = TypeOf<typeof storedTimeSliderControlSchema>;
