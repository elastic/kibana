/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlWidth } from '@kbn/controls-schemas';

export type TimeSlice = [number, number];

export interface DefaultControlState {
  grow?: boolean;
  width?: ControlWidth;
}

export interface SerializedControlState<ControlStateType extends object = object>
  extends DefaultControlState {
  type: string;
  explicitInput: ControlStateType;
}

export interface DefaultDataControlState extends DefaultControlState {
  dataViewId: string;
  fieldName: string;
  title?: string; // custom control label
}
