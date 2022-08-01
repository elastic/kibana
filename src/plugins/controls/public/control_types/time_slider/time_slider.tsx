/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { debounce } from 'lodash';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { timeSliderReducers } from './time_slider_reducers';
import { TimeSlider as Component } from './time_slider.component';
import { TimeSliderReduxState, TimeSliderSubjectState } from './types';

interface TimeSliderProps {
  componentStateSubject: BehaviorSubject<TimeSliderSubjectState>;
  dateFormat: string;
  timezone: string;
  fieldName: string;
  ignoreValidation: boolean;
}

export const TimeSlider: FC<TimeSliderProps> = ({
  componentStateSubject,
  dateFormat,
  timezone,
  fieldName,
  ignoreValidation,
}) => {
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { selectRange },
  } = useReduxEmbeddableContext<TimeSliderReduxState, typeof timeSliderReducers>();
  const dispatch = useEmbeddableDispatch();

  const availableRange = select((state) => state.componentState.range);
  const value = select((state) => state.explicitInput.value);
  const id = select((state) => state.explicitInput.id);

  const { min, max } = availableRange
    ? availableRange
    : ({} as {
        min?: number;
        max?: number;
      });

  const dispatchChange = useCallback(
    (range: [number | null, number | null]) => {
      dispatch(selectRange(range));
    },
    [dispatch, selectRange]
  );

  const debouncedDispatchChange = useMemo(() => debounce(dispatchChange, 500), [dispatchChange]);

  const onChangeComplete = useCallback(
    (range: [number | null, number | null]) => {
      debouncedDispatchChange(range);
    },
    [debouncedDispatchChange]
  );

  return (
    <Component
      id={id}
      onChange={onChangeComplete}
      value={value ?? [null, null]}
      range={[min, max]}
      dateFormat={dateFormat}
      timezone={timezone}
      fieldName={fieldName}
      ignoreValidation={ignoreValidation}
    />
  );
};
