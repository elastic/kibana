/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { EuiRangeTick } from '@elastic/eui';

import { ControlOutput } from '../types';
import { TimeSliderControlEmbeddableInput } from '../../common/time_slider/types';

export * from '../../common/time_slider/types';

// Component state is only used by public components.
export interface TimeSliderSubjectState {
  format: string;
  range?: number;
  isOpen: boolean;
  stepSize: number;
  ticks: EuiRangeTick[];
  timeRangeBounds: [number, number];
  value?: [number, number];
}

// public only - redux embeddable state type
export type TimeSliderReduxState = ReduxEmbeddableState<
  TimeSliderControlEmbeddableInput,
  ControlOutput,
  TimeSliderSubjectState
>;
