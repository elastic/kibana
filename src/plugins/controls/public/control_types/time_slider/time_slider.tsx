/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useState, useMemo, useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { debounce } from 'lodash';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { useStateObservable } from '../../hooks/use_state_observable';
import { TimeSliderControlEmbeddableInput } from '../../../common/control_types/time_slider/types';
import { timeSliderReducers } from './time_slider_reducers';
import { TimeSlider as Component } from './time_slider.component';

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
    useEmbeddableSelector,
    actions: { selectRange },
  } = useReduxEmbeddableContext<TimeSliderControlEmbeddableInput, typeof timeSliderReducers>();
  const dispatch = useEmbeddableDispatch();

  const { range: availableRange } = useStateObservable<TimeSliderSubjectState>(
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

  const debouncedDispatchChange = useMemo(() => debounce(dispatchChange, 500), [dispatchChange]);

  const onChangeComplete = useCallback(
    (range: [number | null, number | null]) => {
      debouncedDispatchChange(range);
    },
    [debouncedDispatchChange]
  );

  useEffect(() => {
    setSelectedValue(value ?? [null, null]);
  }, [value]);

  return (
    <Component
      onChange={onChangeComplete}
      value={selectedValue}
      range={[min, max]}
      dateFormat={dateFormat}
      timezone={timezone}
      fieldName={fieldName}
      ignoreValidation={ignoreValidation}
    />
  );
};
