/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import type { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';

import { RangeSliderEmbeddableInput } from '../../common/range_slider/types';
import { ControlOutput } from '../types';

// Component state is only used by public components.
export interface RangeSliderComponentState {
  field?: FieldSpec;
  min?: number;
  max?: number;
  error?: string;
  isInvalid?: boolean;
}

// public only - redux embeddable state type
export type RangeSliderReduxState = ReduxEmbeddableState<
  RangeSliderEmbeddableInput,
  ControlOutput,
  RangeSliderComponentState
>;
