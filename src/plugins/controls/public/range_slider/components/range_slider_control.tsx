/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useRef } from 'react';

import { EuiFieldNumber, EuiInputPopover, EuiFormControlLayoutDelimited } from '@elastic/eui';

import { useRangeSlider } from '../embeddable/range_slider_embeddable';
import { RangeSliderPopover, EuiDualRangeRef } from './range_slider_popover';

import './range_slider.scss';
import { ControlError } from '../../control_group/component/control_error_component';

const RangeSliderInput = () => {};

export const RangeSliderControl: FC = () => {
  const rangeRef = useRef<EuiDualRangeRef>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const rangeSlider = useRangeSlider();

  const min = rangeSlider.select((state) => state.componentState.min);
  const max = rangeSlider.select((state) => state.componentState.max);
  const error = rangeSlider.select((state) => state.componentState.error);
  const isInvalid = rangeSlider.select((state) => state.componentState.isInvalid);

  const id = rangeSlider.select((state) => state.explicitInput.id);
  const value = rangeSlider.select((state) => state.explicitInput.value) ?? ['', ''];
  const isLoading = rangeSlider.select((state) => state.output.loading);

  const hasAvailableRange = min !== '' && max !== '';

  const hasLowerBoundSelection = value[0] !== '';
  const hasUpperBoundSelection = value[1] !== '';

  const lowerBoundValue = parseFloat(value[0]);
  const upperBoundValue = parseFloat(value[1]);
  const minValue = parseFloat(min);
  const maxValue = parseFloat(max);

  // EuiDualRange can only handle integers as min/max
  const roundedMin = hasAvailableRange ? Math.floor(minValue) : minValue;
  const roundedMax = hasAvailableRange ? Math.ceil(maxValue) : maxValue;

  const button = (
    <EuiFormControlLayoutDelimited
      fullWidth
      isLoading={isLoading}
      className="rangeSliderAnchor__button"
      onClick={(event) => {
        // the popover should remain open if the click target is one of the number inputs
        if (isPopoverOpen && event.target instanceof HTMLInputElement) {
          return;
        }
        setIsPopoverOpen(!isPopoverOpen);
      }}
      startControl={
        <EuiFieldNumber
          controlOnly
          fullWidth
          className={`rangeSliderAnchor__fieldNumber ${hasLowerBoundSelection}`}
          value={hasLowerBoundSelection ? lowerBoundValue : ''}
          onChange={(event) => {
            rangeSlider.dispatch.setSelectedRange([
              event.target.value,
              isNaN(upperBoundValue) ? '' : String(upperBoundValue),
            ]);
          }}
          disabled={isLoading}
          placeholder={`${hasAvailableRange ? roundedMin : ''}`}
          isInvalid={isInvalid}
          data-test-subj="rangeSlider__lowerBoundFieldNumber"
        />
      }
      endControl={
        <EuiFieldNumber
          controlOnly
          fullWidth
          className={`rangeSliderAnchor__fieldNumber ${hasUpperBoundSelection}`}
          value={hasUpperBoundSelection ? upperBoundValue : ''}
          onChange={(event) => {
            rangeSlider.dispatch.setSelectedRange([
              isNaN(lowerBoundValue) ? '' : String(lowerBoundValue),
              event.target.value,
            ]);
          }}
          placeholder={`${hasAvailableRange ? roundedMax : ''}`}
          isInvalid={isInvalid}
          data-test-subj="rangeSlider__upperBoundFieldNumber"
        />
      }
    />
  );

  return error ? (
    <ControlError error={error} />
  ) : (
    <EuiInputPopover
      input={button}
      isOpen={isPopoverOpen}
      display="block"
      panelPaddingSize="s"
      className="rangeSlider__popoverOverride"
      anchorClassName="rangeSlider__anchorOverride"
      panelClassName="rangeSlider__panelOverride"
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downCenter"
      attachToAnchor={false}
      disableFocusTrap
      onPanelResize={(width) => {
        rangeRef.current?.onResize(width);
      }}
    >
      <RangeSliderPopover rangeRef={rangeRef} />
    </EuiInputPopover>
  );
};
