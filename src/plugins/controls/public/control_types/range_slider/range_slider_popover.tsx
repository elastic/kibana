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
  EuiPopoverTitle,
  EuiText,
  EuiInputPopover,
  EuiButtonIcon,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDualRange,
} from '@elastic/eui';

import { RangeSliderStrings } from './range_slider_strings';
import { RangeValue } from './types';

export interface Props {
  id: string;
  isLoading?: boolean;
  min: string;
  max: string;
  title?: string;
  value: RangeValue;
  onChange: (value: RangeValue) => void;
  fieldFormatter: (value: string) => string;
}

export const RangeSliderPopover: FC<Props> = ({
  id,
  isLoading,
  min,
  max,
  title,
  value,
  onChange,
  fieldFormatter,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const rangeRef = useRef<EuiDualRange | null>(null);
  let errorMessage = '';
  let helpText = '';

  const hasAvailableRange = min !== '' && max !== '';
  const hasLowerBoundSelection = value[0] !== '';
  const hasUpperBoundSelection = value[1] !== '';

  const lowerBoundValue = parseFloat(value[0]);
  const upperBoundValue = parseFloat(value[1]);
  const minValue = parseFloat(min);
  const maxValue = parseFloat(max);

  if (!hasAvailableRange) {
    helpText = 'There is no data to display. Adjust the time range and filters.';
  }

  // EuiDualRange can only handle integers as min/max
  const roundedMin = hasAvailableRange ? Math.floor(minValue) : minValue;
  const roundedMax = hasAvailableRange ? Math.ceil(maxValue) : maxValue;

  const isLowerSelectionInvalid = hasLowerBoundSelection && lowerBoundValue > roundedMax;
  const isUpperSelectionInvalid = hasUpperBoundSelection && upperBoundValue < roundedMin;
  const isSelectionInvalid =
    hasAvailableRange && (isLowerSelectionInvalid || isUpperSelectionInvalid);

  if (isSelectionInvalid) {
    helpText = RangeSliderStrings.popover.getNoDataHelpText();
  }

  if (lowerBoundValue > upperBoundValue) {
    errorMessage = RangeSliderStrings.errors.getUpperLessThanLowerErrorMessage();
  }

  const rangeSliderMin = Math.min(
    roundedMin,
    isNaN(lowerBoundValue) ? Infinity : lowerBoundValue,
    isNaN(upperBoundValue) ? Infinity : upperBoundValue
  );
  const rangeSliderMax = Math.max(
    roundedMax,
    isNaN(lowerBoundValue) ? -Infinity : lowerBoundValue,
    isNaN(upperBoundValue) ? -Infinity : upperBoundValue
  );

  const displayedValue = [
    hasLowerBoundSelection ? String(lowerBoundValue) : hasAvailableRange ? String(roundedMin) : '',
    hasUpperBoundSelection ? String(upperBoundValue) : hasAvailableRange ? String(roundedMax) : '',
  ] as RangeValue;

  const ticks = [];
  const levels = [];

  if (hasAvailableRange) {
    ticks.push({ value: rangeSliderMin, label: fieldFormatter(String(rangeSliderMin)) });
    ticks.push({ value: rangeSliderMax, label: fieldFormatter(String(rangeSliderMax)) });
    levels.push({ min: roundedMin, max: roundedMax, color: 'success' });
  }

  const button = (
    <button
      onClick={() => setIsPopoverOpen((openState) => !openState)}
      className="rangeSliderAnchor__button"
      data-test-subj={`range-slider-control-${id}`}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiFieldNumber
            controlOnly
            fullWidth
            className={`rangeSliderAnchor__fieldNumber ${
              hasLowerBoundSelection && isSelectionInvalid
                ? 'rangeSliderAnchor__fieldNumber--invalid'
                : ''
            }`}
            value={hasLowerBoundSelection ? lowerBoundValue : ''}
            onChange={(event) => {
              onChange([event.target.value, isNaN(upperBoundValue) ? '' : String(upperBoundValue)]);
            }}
            disabled={!hasAvailableRange || isLoading}
            placeholder={`${hasAvailableRange ? roundedMin : ''}`}
            isInvalid={isLowerSelectionInvalid}
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
              hasUpperBoundSelection && isSelectionInvalid
                ? 'rangeSliderAnchor__fieldNumber--invalid'
                : ''
            }`}
            value={hasUpperBoundSelection ? upperBoundValue : ''}
            onChange={(event) => {
              onChange([isNaN(lowerBoundValue) ? '' : String(lowerBoundValue), event.target.value]);
            }}
            disabled={!hasAvailableRange || isLoading}
            placeholder={`${hasAvailableRange ? roundedMax : ''}`}
            isInvalid={isUpperSelectionInvalid}
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
        ) : undefined}
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
      onPanelResize={() => {
        if (rangeRef?.current) {
          rangeRef.current.onResize();
        }
      }}
    >
      <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
      <EuiFlexGroup
        className="rangeSlider__actions"
        gutterSize="none"
        data-test-subj="rangeSlider-control-actions"
      >
        <EuiFlexItem>
          <EuiDualRange
            id={id}
            min={hasAvailableRange ? rangeSliderMin : undefined}
            max={hasAvailableRange ? rangeSliderMax : undefined}
            onChange={([newLowerBound, newUpperBound]) => {
              const updatedLowerBound =
                typeof newLowerBound === 'number' ? String(newLowerBound) : value[0];
              const updatedUpperBound =
                typeof newUpperBound === 'number' ? String(newUpperBound) : value[1];

              onChange([updatedLowerBound, updatedUpperBound]);
            }}
            value={displayedValue}
            ticks={hasAvailableRange ? ticks : undefined}
            levels={hasAvailableRange ? levels : undefined}
            showTicks={hasAvailableRange}
            disabled={!hasAvailableRange}
            fullWidth
            ref={rangeRef}
            data-test-subj="rangeSlider__slider"
          />
          <EuiText
            size="s"
            color={errorMessage ? 'danger' : 'default'}
            data-test-subj="rangeSlider__helpText"
          >
            {errorMessage || helpText}
          </EuiText>
        </EuiFlexItem>
        {hasAvailableRange ? (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={RangeSliderStrings.popover.getClearRangeButtonTitle()}>
              <EuiButtonIcon
                iconType="eraser"
                color="danger"
                onClick={() => onChange(['', ''])}
                aria-label={RangeSliderStrings.popover.getClearRangeButtonTitle()}
                data-test-subj="rangeSlider__clearRangeButton"
              />
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiInputPopover>
  );
};
