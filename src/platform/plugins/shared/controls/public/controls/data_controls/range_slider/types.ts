/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DefaultDataControlState } from '../../../../common';
import type { DataControlApi } from '../types';

export type RangeValue = [string, string];

export interface RangesliderControlState extends DefaultDataControlState {
  value?: RangeValue;
  step?: number;
}

export type RangesliderControlApi = DataControlApi;
