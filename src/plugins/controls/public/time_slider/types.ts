/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { EuiRangeTick } from '@elastic/eui';

import { ControlOutput } from '../types';
import { TimeSliderControlEmbeddableInput } from '../../common/time_slider/types';
import { TimeSlice } from '../../common/types';

export * from '../../common/time_slider/types';

// Component state is only used by public components.
export interface TimeSliderSubjectState {
  format: string;
  range?: number;
  isOpen: boolean;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRangeBounds: [number, number];
  value?: TimeSlice;
}

// public only - redux embeddable state type
export type TimeSliderReduxState = ReduxEmbeddableState<
  TimeSliderControlEmbeddableInput,
  ControlOutput,
  TimeSliderSubjectState
>;
