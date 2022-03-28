/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { debounce } from 'lodash';
import { useStateObservable } from '../../hooks/use_state_observable';
import { useReduxEmbeddableContext } from '../../../../presentation_util/public';
import { TimeSliderControlEmbeddableInput } from './time_slider_embeddable';
import { timeSliderReducers } from './time_slider_reducers';
import {
  TimeSlider as Component,
  TimeSliderProps as TimeSliderComponentProps,
} from './time_slider.component';

// This is a container component that wraps the TimeSliderComponent
// It expects a behavior subject

export interface TimeSliderSubjectState {
  range?: {
    min?: number;
    max?: number;
  };
  loading: boolean;
}

interface TimeSliderProps {
  componentStateSubject: BehaviorSubject<TimeSliderSubjectState>;
  dateFormat: string;
  timezone: string;
  fieldName: string;
}

export const TimeSlider: FC<TimeSliderProps> = ({
  componentStateSubject,
  dateFormat,
  timezone,
  fieldName,
}) => {
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector,
    actions: { selectRange },
  } = useReduxEmbeddableContext<TimeSliderControlEmbeddableInput, typeof timeSliderReducers>();
  const dispatch = useEmbeddableDispatch();

  const { range: availableRange, loading } = useStateObservable<TimeSliderSubjectState>(
    componentStateSubject,
    componentStateSubject.getValue()
  );

  const { min, max } = availableRange
    ? availableRange
    : ({} as {
        min?: number;
        max?: number;
      });

  const { value } = useEmbeddableSelector((state) => state);

  const [selectedValue, setSelectedValue] = useState<[number | null, number | null]>(
    value || [null, null]
  );

  const dispatchChange = useCallback(
    (range: [number | null, number | null]) => {
      dispatch(selectRange(range));
    },
    [dispatch, selectRange]
  );

  const debouncedDispatchChange = useCallback(debounce(dispatchChange, 500), [dispatchChange]);

  const onChangeComplete = useCallback(
    (range: [number | null, number | null]) => {
      debouncedDispatchChange(range);
      setSelectedValue(range);
    },
    [setSelectedValue, debouncedDispatchChange]
  );

  return (
    <Component
      onChange={onChangeComplete}
      value={selectedValue}
      range={[min, max]}
      isLoading={loading}
      dateFormat={dateFormat}
      timezone={timezone}
      fieldName={fieldName}
    />
  );
};
