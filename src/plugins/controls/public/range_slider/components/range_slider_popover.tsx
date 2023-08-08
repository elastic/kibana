/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, ComponentProps, Ref, useEffect, useState, useMemo } from 'react';
import useMount from 'react-use/lib/useMount';

import { EuiPopoverTitle, EuiDualRange, EuiText } from '@elastic/eui';
import type { EuiDualRangeClass } from '@elastic/eui/src/components/form/range/dual_range';

import { pluginServices } from '../../services';
import { RangeSliderStrings } from './range_slider_strings';
import { RangeValue } from '../../../common/range_slider/types';
import { useRangeSlider } from '../embeddable/range_slider_embeddable';

// Unfortunately, wrapping EuiDualRange in `withEuiTheme` has created this annoying/verbose typing
export type EuiDualRangeRef = EuiDualRangeClass & ComponentProps<typeof EuiDualRange>;

export const RangeSliderPopover: FC<{
  value: RangeValue;
  onChange: (newRange: RangeValue) => void;
  rangeRef?: Ref<EuiDualRangeRef>;
}> = ({ onChange, value, rangeRef }) => {
  const [fieldFormatter, setFieldFormatter] = useState(() => (toFormat: string) => toFormat);

  // Controls Services Context
  const {
    dataViews: { get: getDataViewById },
  } = pluginServices.getServices();
  const rangeSlider = useRangeSlider();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const dataViewId = rangeSlider.select((state) => state.output.dataViewId);

  const id = rangeSlider.select((state) => state.explicitInput.id);
  const title = rangeSlider.select((state) => state.explicitInput.title);

  const min = rangeSlider.select((state) => state.componentState.min);
  const max = rangeSlider.select((state) => state.componentState.max);
  const fieldSpec = rangeSlider.select((state) => state.componentState.field);
  const isInvalid = rangeSlider.select((state) => state.componentState.isInvalid);

  // Caches min and max displayed on popover open so the range slider doesn't resize as selections change
  const [rangeSliderMin, setRangeSliderMin] = useState<number>(min);
  const [rangeSliderMax, setRangeSliderMax] = useState<number>(max);

  useMount(() => {
    const [lowerBoundSelection, upperBoundSelection] = [parseFloat(value[0]), parseFloat(value[1])];

    setRangeSliderMin(
      Math.min(
        min,
        isNaN(lowerBoundSelection) ? Infinity : lowerBoundSelection,
        isNaN(upperBoundSelection) ? Infinity : upperBoundSelection
      )
    );
    setRangeSliderMax(
      Math.max(
        max,
        isNaN(lowerBoundSelection) ? -Infinity : lowerBoundSelection,
        isNaN(upperBoundSelection) ? -Infinity : upperBoundSelection
      )
    );
  });

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

  const ticks = useMemo(() => {
    return [
      { value: min, label: fieldFormatter(String(min)) },
      { value: max, label: fieldFormatter(String(max)) },
    ];
  }, [min, max, fieldFormatter]);

  const levels = useMemo(() => {
    return [{ min, max, color: 'success' }];
  }, [min, max]);

  return (
    <div data-test-subj="rangeSlider__popover">
      <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>

      {min !== -Infinity && max !== Infinity ? (
        <EuiDualRange
          id={id}
          min={rangeSliderMin}
          max={rangeSliderMax}
          onChange={([minSelection, maxSelection]) => {
            onChange([String(minSelection), String(maxSelection)]);
          }}
          value={value}
          ticks={ticks}
          levels={levels}
          showTicks
          fullWidth
          ref={rangeRef}
          data-test-subj="rangeSlider__slider"
        />
      ) : isInvalid ? (
        <EuiText size="s" data-test-subj="rangeSlider__helpText">
          {RangeSliderStrings.popover.getNoDataHelpText()}
        </EuiText>
      ) : (
        <EuiText size="s" data-test-subj="rangeSlider__helpText">
          {RangeSliderStrings.popover.getNoAvailableDataHelpText()}
        </EuiText>
      )}
    </div>
  );
};
