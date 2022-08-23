/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataControlInput } from '../types';

export const RANGE_SLIDER_CONTROL = 'rangeSliderControl';

export type RangeValue = [string, string];

export interface RangeSliderEmbeddableInput extends DataControlInput {
  value: RangeValue;
}

export type RangeSliderInputWithType = Partial<RangeSliderEmbeddableInput> & { type: string };
