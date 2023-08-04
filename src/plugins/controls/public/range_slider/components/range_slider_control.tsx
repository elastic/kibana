/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import React, { FC, useState, useMemo, useEffect, useCallback, useRef } from 'react';

import { EuiRangeTick, EuiDualRange, EuiDualRangeProps } from '@elastic/eui';

import { pluginServices } from '../../services';
import { RangeValue } from '../../../common/range_slider/types';
import { useRangeSlider } from '../embeddable/range_slider_embeddable';
import { ControlError } from '../../control_group/component/control_error_component';

import './range_slider.scss';

export const RangeSliderControl: FC = () => {
  /** Controls Services Context */
  const {
    dataViews: { get: getDataViewById },
  } = pluginServices.getServices();
  const rangeSlider = useRangeSlider();
  const rangeSliderRef = useRef<EuiDualRangeProps | null>(null);

  // Embeddable explicit input
  const id = rangeSlider.select((state) => state.explicitInput.id);
  const value = rangeSlider.select((state) => state.explicitInput.value);

  // Embeddable cmponent state
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
  const [fieldFormatter, setFieldFormatter] = useState(() => (toFormat: string) => toFormat);

  const debouncedOnChange = useMemo(
    () =>
      debounce((newRange: RangeValue) => {
        rangeSlider.dispatch.setSelectedRange(newRange);
      }, 750),
    [rangeSlider.dispatch]
  );

  /**
   * derive field formatter from fieldSpec and dataViewId
   */
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
    return [Math.min(selectedMin, min), Math.max(selectedMax, max ?? Infinity)];
  }, [min, max, value]);

  /**
   * The following `useEffect` ensures that the changes to the value that come from the embeddable (for example,
   * from the `reset` button on the dashboard or via chaining) are reflected in the displayed value
   */
  useEffect(() => {
    setDisplayedValue(value ?? ['', '']);
  }, [value]);

  const ticks: EuiRangeTick[] = useMemo(() => {
    return [
      { value: min ?? -Infinity, label: fieldFormatter(String(min)) },
      { value: max ?? Infinity, label: fieldFormatter(String(max)) },
    ];
  }, [min, max, fieldFormatter]);

  const levels = useMemo(() => {
    return [
      {
        min: min ?? -Infinity,
        max: max ?? Infinity,
        color: 'success',
      },
    ];
  }, [min, max]);

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
        isInvalid,
        placeholder,
        readOnly: false, // overwrites `canOpenPopover` to ensure that the inputs are always clickable
        className: 'rangeSliderAnchor__fieldNumber',
        'data-test-subj': `rangeSlider__${testSubj}`,
        value: inputValue === placeholder ? '' : inputValue,
      };
    },
    [isInvalid]
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
        ticks={ticks}
        levels={levels}
        min={displayedMin}
        max={displayedMax}
        isLoading={isLoading}
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
