/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import React, { FC, useState, useMemo, useEffect, useCallback, useRef } from 'react';

import { EuiRangeTick, EuiDualRange, EuiDualRangeProps, EuiToken, EuiToolTip } from '@elastic/eui';

import { RangeValue } from '../../../common/range_slider/types';
import { useRangeSlider } from '../embeddable/range_slider_embeddable';
import { ControlError } from '../../control_group/component/control_error_component';

import './range_slider.scss';
import { MIN_POPOVER_WIDTH } from '../../constants';
import { useFieldFormatter } from '../../hooks/use_field_formatter';
import { RangeSliderStrings } from './range_slider_strings';

export const RangeSliderControl: FC = () => {
  /** Controls Services Context */
  const rangeSlider = useRangeSlider();
  const rangeSliderRef = useRef<EuiDualRangeProps | null>(null);

  // Embeddable explicit input
  const id = rangeSlider.select((state) => state.explicitInput.id);
  const value = rangeSlider.select((state) => state.explicitInput.value);
  const step = rangeSlider.select((state) => state.explicitInput.step);

  // Embeddable component state
  const min = rangeSlider.select((state) => state.componentState.min);
  const max = rangeSlider.select((state) => state.componentState.max);
  const error = rangeSlider.select((state) => state.componentState.error);
  const fieldSpec = rangeSlider.select((state) => state.componentState.field);
  const isInvalid = rangeSlider.select((state) => state.componentState.isInvalid);

  // Embeddable output
  const isLoading = rangeSlider.select((state) => state.output.loading);
  const dataViewId = rangeSlider.select((state) => state.output.dataViewId);

  // React component state
  const [displayedValue, setDisplayedValue] = useState<RangeValue>(value ?? ['', '']);

  const fieldFormatter = useFieldFormatter({ dataViewId, fieldSpec });
  const debouncedOnChange = useMemo(
    () =>
      debounce((newRange: RangeValue) => {
        rangeSlider.dispatch.setSelectedRange(newRange);
      }, 750),
    [rangeSlider.dispatch]
  );

  /**
   * This will recalculate the displayed min/max of the range slider to allow for selections smaller
   * than the `min` and larger than the `max`
   */
  const [displayedMin, displayedMax] = useMemo((): [number, number] => {
    if (min === undefined || max === undefined) return [-Infinity, Infinity];
    const selectedValue = value ?? ['', ''];
    const [selectedMin, selectedMax] = [
      selectedValue[0] === '' ? min : parseFloat(selectedValue[0]),
      selectedValue[1] === '' ? max : parseFloat(selectedValue[1]),
    ];

    if (!step) return [Math.min(selectedMin, min), Math.max(selectedMax, max ?? Infinity)];

    const minTick = Math.floor(Math.min(selectedMin, min) / step) * step;
    const maxTick = Math.ceil(Math.max(selectedMax, max) / step) * step;

    return [Math.min(selectedMin, min, minTick), Math.max(selectedMax, max ?? Infinity, maxTick)];
  }, [min, max, value, step]);

  /**
   * The following `useEffect` ensures that the changes to the value that come from the embeddable (for example,
   * from the `reset` button on the dashboard or via chaining) are reflected in the displayed value
   */
  useEffect(() => {
    setDisplayedValue(value ?? ['', '']);
  }, [value]);

  const ticks: EuiRangeTick[] = useMemo(() => {
    return [
      { value: displayedMin ?? -Infinity, label: fieldFormatter(String(displayedMin)) },
      { value: displayedMax ?? Infinity, label: fieldFormatter(String(displayedMax)) },
    ];
  }, [displayedMin, displayedMax, fieldFormatter]);

  const levels = useMemo(() => {
    if (!step || min === undefined || max === undefined) {
      return [
        {
          min: min ?? -Infinity,
          max: max ?? Infinity,
          color: 'success',
        },
      ];
    }

    const roundedMin = Math.floor(min / step) * step;
    const roundedMax = Math.ceil(max / step) * step;

    return [
      {
        min: roundedMin,
        max: roundedMax,
        color: 'success',
      },
    ];
  }, [step, min, max]);

  const disablePopover = useMemo(
    () =>
      isLoading ||
      displayedMin === -Infinity ||
      displayedMax === Infinity ||
      displayedMin === displayedMax,
    [isLoading, displayedMin, displayedMax]
  );

  const getCommonInputProps = useCallback(
    ({
      inputValue,
      testSubj,
      placeholder,
    }: {
      inputValue: string;
      testSubj: string;
      placeholder: string;
    }) => {
      return {
        isInvalid: undefined, // disabling this prop to handle our own validation styling
        placeholder,
        readOnly: false, // overwrites `canOpenPopover` to ensure that the inputs are always clickable
        className: `rangeSliderAnchor__fieldNumber ${
          isInvalid
            ? 'rangeSliderAnchor__fieldNumber--invalid'
            : 'rangeSliderAnchor__fieldNumber--valid'
        }`,
        'data-test-subj': `rangeSlider__${testSubj}`,
        value: inputValue === placeholder ? '' : inputValue,
        title: !isInvalid && step ? '' : undefined, // overwrites native number input validation error when the value falls between two steps
      };
    },
    [isInvalid, step]
  );

  return error ? (
    <ControlError error={error} />
  ) : (
    <span className="rangeSliderAnchor__button" data-test-subj={`range-slider-control-${id}`}>
      <EuiDualRange
        ref={rangeSliderRef}
        id={id}
        fullWidth
        showTicks
        step={step}
        ticks={ticks}
        levels={levels}
        min={displayedMin}
        max={displayedMax}
        isLoading={isLoading}
        inputPopoverProps={{
          panelMinWidth: MIN_POPOVER_WIDTH,
        }}
        append={
          isInvalid ? (
            <div className="rangeSlider__invalidToken">
              <EuiToolTip
                position="top"
                content={RangeSliderStrings.control.getInvalidSelectionWarningLabel()}
                delay="long"
              >
                <EuiToken
                  tabIndex={0}
                  iconType="alert"
                  size="s"
                  color="euiColorVis5"
                  shape="square"
                  fill="dark"
                  title={RangeSliderStrings.control.getInvalidSelectionWarningLabel()}
                />
              </EuiToolTip>
            </div>
          ) : undefined
        }
        onMouseUp={() => {
          // when the pin is dropped (on mouse up), cancel any pending debounced changes and force the change
          // in value to happen instantly (which, in turn, will re-calculate the min/max for the slider due to
          // the `useEffect` above.
          debouncedOnChange.cancel();
          rangeSlider.dispatch.setSelectedRange(displayedValue);
        }}
        readOnly={disablePopover}
        showInput={'inputWithPopover'}
        data-test-subj="rangeSlider__slider"
        minInputProps={getCommonInputProps({
          inputValue: displayedValue[0],
          testSubj: 'lowerBoundFieldNumber',
          placeholder: String(min ?? -Infinity),
        })}
        maxInputProps={getCommonInputProps({
          inputValue: displayedValue[1],
          testSubj: 'upperBoundFieldNumber',
          placeholder: String(max ?? Infinity),
        })}
        value={[displayedValue[0] || displayedMin, displayedValue[1] || displayedMax]}
        onChange={([minSelection, maxSelection]: [number | string, number | string]) => {
          setDisplayedValue([String(minSelection), String(maxSelection)]);
          debouncedOnChange([String(minSelection), String(maxSelection)]);
        }}
      />
    </span>
  );
};
