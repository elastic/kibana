/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import React, { FC, useState, useMemo, useEffect, useCallback } from 'react';

import { EuiDualRange, EuiRangeTick } from '@elastic/eui';

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
  const [displayedMax, setDisplayedMax] = useState<number>(max ?? Infinity);
  const [displayedMin, setDisplayedMin] = useState<number>(min ?? -Infinity);
  const [displayedValue, setDisplayedValue] = useState<RangeValue>(value ?? ['', '']);
  const [fieldFormatter, setFieldFormatter] = useState(() => (toFormat: string) => toFormat);

  const debouncedOnChange = useMemo(
    () =>
      debounce((newRange: RangeValue) => {
        rangeSlider.dispatch.setSelectedRange(newRange);
      }, 750),
    [rangeSlider.dispatch]
  );

  useEffect(() => {
    debouncedOnChange(displayedValue);
  }, [debouncedOnChange, displayedValue]);

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

  /**
   * The following `useEffects` ensure that the changes to min, max, and value that come from the embeddable (for example,
   * from the `reset` button on the dashboard or via chaining) are reflected in the displayed value
   */
  useEffect(() => setDisplayedValue(value ?? ['', '']), [value]);
  useEffect(() => setDisplayedMin(min ?? -Infinity), [min]);
  useEffect(() => setDisplayedMax(max ?? Infinity), [max]);

  const ticks: EuiRangeTick[] = useMemo(() => {
    return [
      { value: displayedMin, label: fieldFormatter(String(displayedMin)) },
      { value: displayedMax, label: fieldFormatter(String(displayedMax)) },
    ];
  }, [displayedMin, displayedMax, fieldFormatter]);

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
        id={id}
        fullWidth
        showTicks
        ticks={ticks}
        min={displayedMin}
        max={displayedMax}
        isLoading={isLoading}
        readOnly={disablePopover}
        showInput={'inputWithPopover'}
        data-test-subj="rangeSlider__slider"
        minInputProps={getCommonInputProps({
          inputValue: displayedValue[0],
          testSubj: 'lowerBoundFieldNumber',
          placeholder: String(displayedMin),
        })}
        maxInputProps={getCommonInputProps({
          inputValue: displayedValue[1],
          testSubj: 'upperBoundFieldNumber',
          placeholder: String(displayedMax),
        })}
        value={[displayedValue[0] || displayedMin, displayedValue[1] || displayedMax]}
        onChange={([minSelection, maxSelection]: [number | string, number | string]) => {
          setDisplayedValue([String(minSelection), String(maxSelection)]);
        }}
      />
    </span>
  );
};
