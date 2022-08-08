/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
import React, { useState, useRef, useEffect } from 'react';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { RangeSliderStrings } from './range_slider_strings';
import { RangeSliderReduxState, RangeValue } from './types';
import { rangeSliderReducers } from './range_slider_reducers';
import { pluginServices } from '../../services';

const INVALID_CLASS = 'rangeSliderAnchor__fieldNumber--invalid';

export const RangeSliderPopover = () => {
  // Controls Services Context
  const { dataViews } = pluginServices.getHooks();
  const { get: getDataViewById } = dataViews.useService();

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [rangeSliderMin, setRangeSliderMin] = useState<number>(-Infinity);
  const [rangeSliderMax, setRangeSliderMax] = useState<number>(Infinity);
  const [fieldFormatter, setFieldFormatter] = useState(() => (toFormat: string) => toFormat);

  const rangeRef = useRef<EuiDualRange | null>(null);

  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setSelectedRange },
  } = useReduxEmbeddableContext<RangeSliderReduxState, typeof rangeSliderReducers>();
  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const min = select((state) => state.componentState.min);
  const max = select((state) => state.componentState.max);
  const isInvalid = select((state) => state.componentState.isInvalid);
  const fieldSpec = select((state) => state.componentState.field);

  const id = select((state) => state.explicitInput.id);
  const value = select((state) => state.explicitInput.value) ?? ['', ''];
  const title = select((state) => state.explicitInput.title);

  const isLoading = select((state) => state.output.loading);
  const dataViewId = select((state) => state.output.dataViewId);

  // derive field formatter from fieldSpec and dataViewId
  useEffect(() => {
    (async () => {
      if (!dataViewId || !fieldSpec) return;
      // dataViews are cached, and should always be available without having to hit ES.
      const dataView = await getDataViewById(dataViewId);
      setFieldFormatter(
        () =>
          dataView?.getFormatterForField(fieldSpec).getConverterFor('text') ??
          ((toFormat: string) => toFormat)
      );
    })();
  }, [fieldSpec, dataViewId, getDataViewById]);

  let errorMessage = '';
  let helpText = '';

  const hasAvailableRange = min !== '' && max !== '';

  if (!hasAvailableRange) {
    helpText = RangeSliderStrings.popover.getNoAvailableDataHelpText();
  } else if (isInvalid) {
    helpText = RangeSliderStrings.popover.getNoDataHelpText();
  }

  const hasLowerBoundSelection = value[0] !== '';
  const hasUpperBoundSelection = value[1] !== '';

  const lowerBoundValue = parseFloat(value[0]);
  const upperBoundValue = parseFloat(value[1]);
  const minValue = parseFloat(min);
  const maxValue = parseFloat(max);

  // EuiDualRange can only handle integers as min/max
  const roundedMin = hasAvailableRange ? Math.floor(minValue) : minValue;
  const roundedMax = hasAvailableRange ? Math.ceil(maxValue) : maxValue;

  if (lowerBoundValue > upperBoundValue) {
    errorMessage = RangeSliderStrings.errors.getUpperLessThanLowerErrorMessage();
  }

  const displayedValue = [
    hasLowerBoundSelection ? String(lowerBoundValue) : hasAvailableRange ? String(roundedMin) : '',
    hasUpperBoundSelection ? String(upperBoundValue) : hasAvailableRange ? String(roundedMax) : '',
  ] as RangeValue;

  const ticks = [];
  const levels = [];

  if (hasAvailableRange && isPopoverOpen) {
    ticks.push({ value: rangeSliderMin, label: fieldFormatter(String(rangeSliderMin)) });
    ticks.push({ value: rangeSliderMax, label: fieldFormatter(String(rangeSliderMax)) });
    levels.push({ min: roundedMin, max: roundedMax, color: 'success' });
  }

  const button = (
    <button
      onClick={() => {
        // caches min and max displayed on popover open so the range slider doesn't resize as selections change
        if (!isPopoverOpen) {
          setRangeSliderMin(
            Math.min(
              roundedMin,
              isNaN(lowerBoundValue) ? Infinity : lowerBoundValue,
              isNaN(upperBoundValue) ? Infinity : upperBoundValue
            )
          );
          setRangeSliderMax(
            Math.max(
              roundedMax,
              isNaN(lowerBoundValue) ? -Infinity : lowerBoundValue,
              isNaN(upperBoundValue) ? -Infinity : upperBoundValue
            )
          );
        }

        setIsPopoverOpen((openState) => !openState);
      }}
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
              dispatch(
                setSelectedRange([
                  event.target.value,
                  isNaN(upperBoundValue) ? '' : String(upperBoundValue),
                ])
              );
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
              dispatch(
                setSelectedRange([
                  isNaN(lowerBoundValue) ? '' : String(lowerBoundValue),
                  event.target.value,
                ])
              );
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
        responsive={false}
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

              dispatch(setSelectedRange([updatedLowerBound, updatedUpperBound]));
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
        <EuiFlexItem grow={false}>
          <EuiToolTip content={RangeSliderStrings.popover.getClearRangeButtonTitle()}>
            <EuiButtonIcon
              iconType="eraser"
              color="danger"
              onClick={() => dispatch(setSelectedRange(['', '']))}
              aria-label={RangeSliderStrings.popover.getClearRangeButtonTitle()}
              data-test-subj="rangeSlider__clearRangeButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiInputPopover>
  );
};
