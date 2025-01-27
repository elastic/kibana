/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';
import { CONTROL_LABEL_POSITION_OPTIONS, CONTROL_WIDTH_OPTIONS } from './constants';

export type ControlWidth = (typeof CONTROL_WIDTH_OPTIONS)[keyof typeof CONTROL_WIDTH_OPTIONS];
export type ControlLabelPosition =
  (typeof CONTROL_LABEL_POSITION_OPTIONS)[keyof typeof CONTROL_LABEL_POSITION_OPTIONS];

export type TimeSlice = [number, number];

export interface ParentIgnoreSettings extends SerializableRecord {
  ignoreFilters?: boolean;
  ignoreQuery?: boolean;
  ignoreTimerange?: boolean;
  ignoreValidations?: boolean;
}

export interface DefaultControlState {
  grow?: boolean;
  width?: ControlWidth;
}

export interface SerializedControlState<ControlStateType extends object = object>
  extends DefaultControlState {
  type: string;
  explicitInput: { id: string } & ControlStateType;
}

export interface DefaultDataControlState extends DefaultControlState {
  dataViewId: string;
  fieldName: string;
  title?: string; // custom control label
}
