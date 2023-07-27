/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import React, { FC, useState, useMemo, useEffect } from 'react';

import {
  EuiDualRange,
  EuiFieldNumber,
  EuiFormControlLayoutDelimited,
  EuiRangeTick,
} from '@elastic/eui';

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
  const [displayedValue, setDisplayedValue] = useState<RangeValue>(value ?? ['', '']);
  const [fieldFormatter, setFieldFormatter] = useState(() => (toFormat: string) => toFormat);

  useEffect(() => {
    // Ensures that changes to the value (for example, from the `reset` button on the dashboard) are reflected
    // in the displayed value
    setDisplayedValue(value ?? ['', '']);
  }, [value]);

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

  const ticks: EuiRangeTick[] = useMemo(() => {
    return [
      { value: min ?? -Infinity, label: fieldFormatter(String(min)) },
      { value: max ?? Infinity, label: fieldFormatter(String(max)) },
    ];
  }, [min, max, fieldFormatter]);

  return error ? (
    <ControlError error={error} />
  ) : min === undefined || max === undefined || min === -Infinity || max === Infinity ? (
    <EuiFormControlLayoutDelimited
      fullWidth
      startControl={
        <EuiFieldNumber
          controlOnly
          isInvalid={isInvalid}
          onChange={(newValue) => {
            setDisplayedValue([newValue.target.value, displayedValue[1]]);
          }}
          value={displayedValue[0]}
          placeholder={String(min)}
          className="rangeSliderAnchor__fieldNumber"
          aria-label="Use aria labels when no actual label is in use"
        />
      }
      endControl={
        <EuiFieldNumber
          controlOnly
          isInvalid={isInvalid}
          onChange={(newValue) => {
            setDisplayedValue([displayedValue[0], newValue.target.value]);
          }}
          value={displayedValue[1]}
          placeholder={String(max)}
          className="rangeSliderAnchor__fieldNumber"
          aria-label="Use aria labels when no actual label is in use"
        />
      }
    />
  ) : (
    <EuiDualRange
      id={id}
      min={min}
      max={max}
      fullWidth
      showTicks
      ticks={ticks}
      readOnly={isLoading}
      isLoading={isLoading}
      showInput={'inputWithPopover'}
      value={[displayedValue[0] || min, displayedValue[1] || max]}
      minInputProps={{
        isInvalid,
        placeholder: String(min),
        className: 'rangeSliderAnchor__fieldNumber',
        value: String(min) === displayedValue[0] ? '' : displayedValue[0],
      }}
      maxInputProps={{
        isInvalid,
        placeholder: String(max),
        className: 'rangeSliderAnchor__fieldNumber',
        value: String(max) === displayedValue[1] ? '' : displayedValue[1],
      }}
      onChange={([minSelection, maxSelection]: [number | string, number | string]) => {
        setDisplayedValue([String(minSelection), String(maxSelection)]);
      }}
    />
  );
};
