/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, useState } from 'react';
import { EuiFieldNumber, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';
import { rangeSliderReducers } from '../range_slider_reducers';
import { RangeSliderReduxState } from '../types';
import { RangeSliderStrings } from './range_slider_strings';

export const SettingsForm: FC = () => {
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setStepSize },
  } = useReduxEmbeddableContext<RangeSliderReduxState, typeof rangeSliderReducers>();
  const dispatch = useEmbeddableDispatch();
  const stepSize = select((state) => {
    return typeof state.componentState.stepSize === 'number' ? state.componentState.stepSize : 1;
  });
  const max = select((state) => state.componentState.max);

  const [stepSizeError, setStepSizeError] = useState('');
  const [localStepSize, setLocalStepSize] = useState(stepSize);

  const isStepSizeInvalid = stepSizeError.length > 0;

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={RangeSliderStrings.settings.getStepSizeLabel()}
        display="columnCompressed"
        isInvalid={isStepSizeInvalid}
        error={stepSizeError}
      >
        <EuiFieldNumber
          value={localStepSize}
          onChange={(event) => {
            const value = event.target.valueAsNumber;
            setLocalStepSize(value);

            if (isNaN(value) || value <= 0) {
              setStepSizeError(RangeSliderStrings.settings.getStepSizeNotPositiveNumberError());
              return;
            }

            const maxAsNumber = Number(max);
            if (!isNaN(maxAsNumber) && value >= maxAsNumber) {
              setStepSizeError(RangeSliderStrings.settings.getStepSizeNotLessThenMaxError(max));
              return;
            }

            setStepSizeError('');
            dispatch(setStepSize({ stepSize: value }));
          }}
          isInvalid={isStepSizeInvalid}
        />
      </EuiFormRow>
    </>
  );
};
