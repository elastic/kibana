/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiFieldNumber, EuiFormControlLayoutDelimited } from '@elastic/eui';

import './range_slider.scss';
import { RangeValue } from '../../../common/range_slider/types';
import { useRangeSlider } from '../embeddable/range_slider_embeddable';

export const RangeSliderButton = ({
  value,
  onClick,
  onChange,
}: {
  value: RangeValue;
  onChange: (newRange: RangeValue) => void;
  onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}) => {
  const rangeSlider = useRangeSlider();

  const min = rangeSlider.select((state) => state.componentState.min);
  const max = rangeSlider.select((state) => state.componentState.max);
  const isInvalid = rangeSlider.select((state) => state.componentState.isInvalid);

  const id = rangeSlider.select((state) => state.explicitInput.id);

  const isLoading = rangeSlider.select((state) => state.output.loading);

  return (
    <EuiFormControlLayoutDelimited
      fullWidth
      onClick={onClick}
      isLoading={isLoading}
      className="rangeSliderAnchor__button"
      data-test-subj={`range-slider-control-${id}`}
      startControl={
        <EuiFieldNumber
          controlOnly
          fullWidth
          value={value[0] === String(min) ? '' : value[0]}
          onChange={(event) => {
            onChange([event.target.value, value[1]]);
          }}
          placeholder={String(min)}
          isInvalid={isInvalid}
          className={'rangeSliderAnchor__fieldNumber'}
          data-test-subj={'rangeSlider__lowerBoundFieldNumber'}
        />
      }
      endControl={
        <EuiFieldNumber
          controlOnly
          fullWidth
          value={value[1] === String(max) ? '' : value[1]}
          onChange={(event) => {
            onChange([value[0], event.target.value]);
          }}
          placeholder={String(max)}
          isInvalid={isInvalid}
          className={'rangeSliderAnchor__fieldNumber'}
          data-test-subj={'rangeSlider__upperBoundFieldNumber'}
        />
      }
    />
  );
};
