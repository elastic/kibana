/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { BehaviorSubject } from 'rxjs';
import { useStateObservable } from '../../hooks/use_state_observable';
import { TimeSliderControlEmbeddableInput } from './time_slider_embeddable';
import {
  TimeSlider as Component,
  TimeSliderProps as TimeSliderComponentProps,
} from './time_slider.component';

// This is a container component that wraps the TimeSliderComponent
// It expects a behavior subject

export interface TimeSliderSubjectState {
  min?: number;
  max?: number;
}

interface TimeSliderProps {
  componentStateSubject: BehaviorSubject<TimeSliderSubjectState>;
}

export const TimeSlider: FC<TimeSliderProps & TimeSliderControlEmbeddableInput> = ({
  componentStateSubject,
  value,
}) => {
  const { min, max } = useStateObservable<TimeSliderSubjectState>(
    componentStateSubject,
    componentStateSubject.getValue()
  );

  if (!value) {
    value = [min || 0, max || 0];
  }

  return <Component onChange={() => undefined} value={value} range={[min || 0, max || 0]} />;
};
