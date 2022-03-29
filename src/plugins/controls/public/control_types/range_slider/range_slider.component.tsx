/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

import { DataViewField } from '../../../../data_views/public';
import { useReduxEmbeddableContext } from '../../../../presentation_util/public';
import { useStateObservable } from '../../hooks/use_state_observable';
import { RangeSliderPopover } from './range_slider_popover';
import { rangeSliderReducers } from './range_slider_reducers';
import { RangeSliderEmbeddableInput, RangeValue } from './types';

import './range_slider.scss';

interface Props {
  componentStateSubject: BehaviorSubject<RangeSliderComponentState>;
}
// Availableoptions and loading state is controled by the embeddable, but is not considered embeddable input.
export interface RangeSliderComponentState {
  field?: DataViewField;
  fieldFormatter: (value: string) => string;
  min: string;
  max: string;
  loading: boolean;
}

export const RangeSliderComponent: FC<Props> = ({ componentStateSubject }) => {
  // Redux embeddable Context to get state from Embeddable input
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector,
    actions: { selectRange },
  } = useReduxEmbeddableContext<RangeSliderEmbeddableInput, typeof rangeSliderReducers>();
  const dispatch = useEmbeddableDispatch();

  // useStateObservable to get component state from Embeddable
  const { loading, min, max, fieldFormatter } = useStateObservable<RangeSliderComponentState>(
    componentStateSubject,
    componentStateSubject.getValue()
  );

  const { value = ['', ''], id, title } = useEmbeddableSelector((state) => state);

  const [selectedValue, setSelectedValue] = useState<RangeValue>(value || ['', '']);

  const onChangeComplete = useCallback(
    (range: RangeValue) => {
      dispatch(selectRange(range));
      setSelectedValue(range);
    },
    [selectRange, setSelectedValue, dispatch]
  );

  return (
    <RangeSliderPopover
      id={id}
      isLoading={loading}
      min={min}
      max={max}
      title={title}
      value={selectedValue}
      onChange={onChangeComplete}
      fieldFormatter={fieldFormatter}
    />
  );
};
