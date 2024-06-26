/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import { EuiRangeTick, EuiDualRange, EuiDualRangeProps, EuiToken, EuiToolTip } from '@elastic/eui';
import { RangeValue } from '../types';
import './range_slider.scss';
import { MIN_POPOVER_WIDTH } from '../../../constants';
import { RangeSliderStrings } from '../range_slider_strings';

interface Props {
  fieldFormatter?: (value: string) => string;
  isInvalid: boolean;
  isLoading: boolean;
  max: number | undefined;
  min: number | undefined;
  onChange: (value: RangeValue | undefined) => void;
  step: number | undefined;
  value: RangeValue | undefined;
  uuid: string;
}

export const RangeSliderControl: FC<Props> = ({
  fieldFormatter,
  isInvalid,
  isLoading,
  max,
  min,
  onChange,
  step,
  value,
  uuid,
}: Props) => {
  const rangeSliderRef = useRef<EuiDualRangeProps | null>(null);

  const [displayedValue, setDisplayedValue] = useState<RangeValue>(value ?? ['', '']);
  const debouncedOnChange = useMemo(
    () =>
      debounce((newRange: RangeValue) => {
        onChange(newRange);
      }, 750),
    [onChange]
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
      {
        value: displayedMin ?? -Infinity,
        label: fieldFormatter ? fieldFormatter(String(displayedMin)) : displayedMin,
      },
      {
        value: displayedMax ?? Infinity,
        label: fieldFormatter ? fieldFormatter(String(displayedMax)) : displayedMax,
      },
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

  const minInputProps = useMemo(() => {
    return getCommonInputProps({
      inputValue: displayedValue[0],
      testSubj: 'lowerBoundFieldNumber',
      placeholder: String(min ?? -Infinity),
    });
  }, [getCommonInputProps, min, displayedValue]);

  const maxInputProps = useMemo(() => {
    return getCommonInputProps({
      inputValue: displayedValue[1],
      testSubj: 'upperBoundFieldNumber',
      placeholder: String(max ?? Infinity),
    });
  }, [getCommonInputProps, max, displayedValue]);

  return (
    <span className="rangeSliderAnchor__button" data-test-subj={`range-slider-control-${uuid}`}>
      <EuiDualRange
        ref={rangeSliderRef}
        id={uuid}
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
            <div
              className="rangeSlider__invalidToken"
              data-test-subj={`range-slider-control-invalid-append-${uuid}`}
            >
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
          onChange(displayedValue);
        }}
        readOnly={disablePopover}
        showInput={'inputWithPopover'}
        data-test-subj="rangeSlider__slider"
        minInputProps={minInputProps}
        maxInputProps={maxInputProps}
        value={[displayedValue[0] || displayedMin, displayedValue[1] || displayedMax]}
        onChange={([minSelection, maxSelection]: [number | string, number | string]) => {
          setDisplayedValue([String(minSelection), String(maxSelection)]);
          debouncedOnChange([String(minSelection), String(maxSelection)]);
        }}
      />
    </span>
  );
};
