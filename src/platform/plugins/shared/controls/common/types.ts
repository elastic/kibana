/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedTitles } from '@kbn/presentation-publishing';

export type TimeSlice = [number, number];

export type SerializedControlPanelState<ControlStateType extends object = object> =
  SerializedTitles & ControlStateType;

export interface DataControlState {
  dataViewId: string;
  fieldName: string;
  useGlobalFilters?: boolean;
}

export type SerializedDataControlState = SerializedControlPanelState<
  Omit<DataControlState, 'dataViewId'>
>;
