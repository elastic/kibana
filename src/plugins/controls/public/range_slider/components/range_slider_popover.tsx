/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, ComponentProps, Ref, useEffect, useState } from 'react';
import useMount from 'react-use/lib/useMount';

import {
  EuiPopoverTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDualRange,
  EuiText,
  EuiToolTip,
  EuiButtonIcon,
} from '@elastic/eui';
import type { EuiDualRangeClass } from '@elastic/eui/src/components/form/range/dual_range';
import { useReduxEmbeddableContext } from '@kbn/presentation-util-plugin/public';

import { RangeValue } from '../../../common/range_slider/types';
import { pluginServices } from '../../services';
import { rangeSliderReducers } from '../range_slider_reducers';
import { RangeSliderReduxState } from '../types';
import { RangeSliderStrings } from './range_slider_strings';

// Unfortunately, wrapping EuiDualRange in `withEuiTheme` has created this annoying/verbose typing
export type EuiDualRangeRef = EuiDualRangeClass & ComponentProps<typeof EuiDualRange>;

export const RangeSliderPopover: FC<{ rangeRef?: Ref<EuiDualRangeRef> }> = ({ rangeRef }) => {
  const [fieldFormatter, setFieldFormatter] = useState(() => (toFormat: string) => toFormat);

  // Controls Services Context
  const {
    dataViews: { get: getDataViewById },
  } = pluginServices.getServices();
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    actions: { setSelectedRange },
  } = useReduxEmbeddableContext<RangeSliderReduxState, typeof rangeSliderReducers>();

  const dispatch = useEmbeddableDispatch();

  // Select current state from Redux using multiple selectors to avoid rerenders.
  const dataViewId = select((state) => state.output.dataViewId);
  const fieldSpec = select((state) => state.componentState.field);
  const id = select((state) => state.explicitInput.id);
  const isInvalid = select((state) => state.componentState.isInvalid);
  const max = select((state) => state.componentState.max);
  const min = select((state) => state.componentState.min);
  const title = select((state) => state.explicitInput.title);
  const value = select((state) => state.explicitInput.value) ?? ['', ''];

  const hasAvailableRange = min !== '' && max !== '';
  const hasLowerBoundSelection = value[0] !== '';
  const hasUpperBoundSelection = value[1] !== '';

  const lowerBoundSelection = parseFloat(value[0]);
  const upperBoundSelection = parseFloat(value[1]);
  const minValue = parseFloat(min);
  const maxValue = parseFloat(max);

  // EuiDualRange can only handle integers as min/max
  const roundedMin = hasAvailableRange ? Math.floor(minValue) : minValue;
  const roundedMax = hasAvailableRange ? Math.ceil(maxValue) : maxValue;

  // Caches min and max displayed on popover open so the range slider doesn't resize as selections change
  const [rangeSliderMin, setRangeSliderMin] = useState<number>(roundedMin);
  const [rangeSliderMax, setRangeSliderMax] = useState<number>(roundedMax);

  useMount(() => {
    setRangeSliderMin(
      Math.min(
        roundedMin,
        isNaN(lowerBoundSelection) ? Infinity : lowerBoundSelection,
        isNaN(upperBoundSelection) ? Infinity : upperBoundSelection
      )
    );
    setRangeSliderMax(
      Math.max(
        roundedMax,
        isNaN(lowerBoundSelection) ? -Infinity : lowerBoundSelection,
        isNaN(upperBoundSelection) ? -Infinity : upperBoundSelection
      )
    );
  });

  const errorMessage = '';
  let helpText = '';

  if (!hasAvailableRange) {
    helpText = RangeSliderStrings.popover.getNoAvailableDataHelpText();
  } else if (isInvalid) {
    helpText = RangeSliderStrings.popover.getNoDataHelpText();
  }

  const displayedValue = [
    hasLowerBoundSelection
      ? String(lowerBoundSelection)
      : hasAvailableRange
      ? String(roundedMin)
      : '',
    hasUpperBoundSelection
      ? String(upperBoundSelection)
      : hasAvailableRange
      ? String(roundedMax)
      : '',
  ] as RangeValue;

  const ticks = [];
  const levels = [];

  if (hasAvailableRange) {
    ticks.push({ value: rangeSliderMin, label: fieldFormatter(String(rangeSliderMin)) });
    ticks.push({ value: rangeSliderMax, label: fieldFormatter(String(rangeSliderMax)) });
    levels.push({ min: roundedMin, max: roundedMax, color: 'success' });
  }

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

  return (
    <>
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
            min={hasAvailableRange ? rangeSliderMin : 0}
            max={hasAvailableRange ? rangeSliderMax : 100}
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
              onClick={() => {
                dispatch(setSelectedRange(['', '']));
              }}
              aria-label={RangeSliderStrings.popover.getClearRangeButtonTitle()}
              data-test-subj="rangeSlider__clearRangeButton"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
