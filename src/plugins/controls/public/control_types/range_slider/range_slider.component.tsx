/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback } from 'react';
import { BehaviorSubject } from 'rxjs';

import { DataViewField } from '@kbn/data-views-plugin/public';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { useStateObservable } from '../../hooks/use_state_observable';
import { RangeSliderPopover } from './range_slider_popover';
import { rangeSliderReducers } from './range_slider_reducers';
import { RangeSliderEmbeddableInput, RangeValue } from './types';

import './range_slider.scss';
import { pluginServices } from '../../services';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

interface Props {
  componentStateSubject: BehaviorSubject<RangeSliderComponentState>;
  ignoreValidation: boolean;
}
// Availableoptions and loading state is controled by the embeddable, but is not considered embeddable input.
export interface RangeSliderComponentState {
  field?: DataViewField;
  fieldFormatter: (value: string) => string;
  min: string;
  max: string;
  loading: boolean;
  isInvalid?: boolean;
}

export const RangeSliderComponent: FC<Props> = ({ componentStateSubject, ignoreValidation }) => {
  const { theme } = pluginServices.getServices();

  // Redux embeddable Context to get state from Embeddable input
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector,
    actions: { selectRange },
  } = useReduxEmbeddableContext<RangeSliderEmbeddableInput, typeof rangeSliderReducers>();
  const dispatch = useEmbeddableDispatch();

  // useStateObservable to get component state from Embeddable
  const { loading, min, max, fieldFormatter, isInvalid } =
    useStateObservable<RangeSliderComponentState>(
      componentStateSubject,
      componentStateSubject.getValue()
    );

  const { value, id, title } = useEmbeddableSelector((state) => state);

  const onChangeComplete = useCallback(
    (range: RangeValue) => {
      dispatch(selectRange(range));
    },
    [selectRange, dispatch]
  );

  return (
    <KibanaThemeProvider theme$={theme.theme$}>
      <RangeSliderPopover
        id={id}
        isLoading={loading}
        min={min}
        max={max}
        title={title}
        value={value ?? ['', '']}
        onChange={onChangeComplete}
        fieldFormatter={fieldFormatter}
        isInvalid={!ignoreValidation && isInvalid}
      />
    </KibanaThemeProvider>
  );
};
