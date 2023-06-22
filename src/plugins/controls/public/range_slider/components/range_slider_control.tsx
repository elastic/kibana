/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useRef } from 'react';

import {
  EuiFieldNumber,
  EuiText,
  EuiInputPopover,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { useRangeSlider } from '../embeddable/range_slider_embeddable';
import { RangeSliderPopover, EuiDualRangeRef } from './range_slider_popover';

import './range_slider.scss';

const INVALID_CLASS = 'rangeSliderAnchor__fieldNumber--invalid';

export const RangeSliderControl: FC = () => {
  const rangeRef = useRef<EuiDualRangeRef>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const rangeSlider = useRangeSlider();

  const min = rangeSlider.select((state) => state.componentState.min);
  const max = rangeSlider.select((state) => state.componentState.max);
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
    <button
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      className="rangeSliderAnchor__button"
      data-test-subj={`range-slider-control-${id}`}
    >
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <EuiFieldNumber
            controlOnly
            fullWidth
            className={`rangeSliderAnchor__fieldNumber ${
              hasLowerBoundSelection && isInvalid ? INVALID_CLASS : ''
            }`}
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText className="rangeSliderAnchor__delimiter" size="s" color="subdued">
            →
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldNumber
            controlOnly
            fullWidth
            className={`rangeSliderAnchor__fieldNumber ${
              hasUpperBoundSelection && isInvalid ? INVALID_CLASS : ''
            }`}
            value={hasUpperBoundSelection ? upperBoundValue : ''}
            onChange={(event) => {
              rangeSlider.dispatch.setSelectedRange([
                isNaN(lowerBoundValue) ? '' : String(lowerBoundValue),
                event.target.value,
              ]);
            }}
            disabled={isLoading}
            placeholder={`${hasAvailableRange ? roundedMax : ''}`}
            isInvalid={isInvalid}
            data-test-subj="rangeSlider__upperBoundFieldNumber"
          />
        </EuiFlexItem>
        {isLoading ? (
          <EuiFlexItem
            grow={false}
            className="rangeSliderAnchor__spinner"
            data-test-subj="range-slider-loading-spinner"
          >
            <EuiLoadingSpinner />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </button>
  );

  return (
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
