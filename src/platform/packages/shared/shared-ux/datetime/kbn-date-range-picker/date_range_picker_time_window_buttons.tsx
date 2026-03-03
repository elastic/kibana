/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';

import dateMath from '@elastic/datemath';
import moment from 'moment';
import { EuiButtonGroup, type EuiButtonGroupOptionProps } from '@elastic/eui';

import { useDateRangePickerContext } from './date_range_picker_context';
import { timeWindowButtonsTexts as translations } from './translations';

/** Configuration for time window buttons. */
export interface TimeWindowButtonsConfig {
  /**
   * How much the time window is increased/decreased when zooming.
   * A number between 0 and 1, or a percentage string e.g. "25%".
   * @default 0.5
   */
  zoomFactor?: number | string;
  /**
   * Show buttons for shifting the time window forward and backward.
   * @default true
   */
  showShiftArrows?: boolean;
  /**
   * Show the "zoom out" button.
   * @default true
   */
  showZoomOut?: boolean;
  /**
   * Show the "zoom in" button.
   * @default false
   */
  showZoomIn?: boolean;
}

export const DEFAULT_ZOOM_FACTOR = 0.5;

/** Minimum zoom delta (ms) used when the window is zero-width. */
export const ZOOM_DELTA_FALLBACK_MS = 500;

const BUTTON_ID_PREVIOUS = 'previous';
const BUTTON_ID_ZOOM_OUT = 'zoomOut';
const BUTTON_ID_ZOOM_IN = 'zoomIn';
const BUTTON_ID_NEXT = 'next';

/**
 * Time window control buttons rendered beside the DateRangePicker control.
 * Provides step forward/backward and zoom out/in actions.
 */
export function TimeWindowButtons({ config }: { config: TimeWindowButtonsConfig }) {
  const { timeRange, applyRange, compressed } = useDateRangePickerContext();
  const {
    showShiftArrows = true,
    showZoomOut = true,
    showZoomIn = false,
    zoomFactor = DEFAULT_ZOOM_FACTOR,
  } = config;

  const { stepForward, stepBackward, expandWindow, shrinkWindow, isWindowDurationZero, isInvalid } =
    useTimeWindow(timeRange.start, timeRange.end, applyRange, { zoomFactor });

  const onChange = useCallback(
    (id: string) => {
      switch (id) {
        case BUTTON_ID_PREVIOUS:
          return stepBackward();
        case BUTTON_ID_ZOOM_OUT:
          return expandWindow();
        case BUTTON_ID_ZOOM_IN:
          return shrinkWindow();
        case BUTTON_ID_NEXT:
          return stepForward();
      }
    },
    [stepBackward, expandWindow, shrinkWindow, stepForward]
  );

  const options = useMemo<EuiButtonGroupOptionProps[]>(() => {
    const items: EuiButtonGroupOptionProps[] = [];

    if (showShiftArrows) {
      items.push({
        id: BUTTON_ID_PREVIOUS,
        label: translations.previousLabel,
        title: '',
        iconType: 'arrowLeft',
        isDisabled: isInvalid || isWindowDurationZero,
        toolTipContent: isInvalid ? translations.cannotShiftInvalid : translations.previousTooltip,
        'data-test-subj': 'dateRangePickerPreviousButton',
      });
    }

    if (showZoomOut) {
      items.push({
        id: BUTTON_ID_ZOOM_OUT,
        label: translations.zoomOutLabel,
        title: '',
        iconType: 'magnifyWithMinus',
        isDisabled: isInvalid,
        toolTipContent: isInvalid ? translations.cannotZoomOutInvalid : translations.zoomOutTooltip,
        'data-test-subj': 'dateRangePickerZoomOutButton',
      });
    }

    if (showZoomIn) {
      items.push({
        id: BUTTON_ID_ZOOM_IN,
        label: translations.zoomInLabel,
        title: '',
        iconType: 'magnifyWithPlus',
        isDisabled: isInvalid || isWindowDurationZero,
        toolTipContent: isInvalid
          ? translations.cannotZoomInInvalid
          : isWindowDurationZero
          ? translations.cannotZoomInFurther
          : translations.zoomInTooltip,
        'data-test-subj': 'dateRangePickerZoomInButton',
      });
    }

    if (showShiftArrows) {
      items.push({
        id: BUTTON_ID_NEXT,
        label: translations.nextLabel,
        title: '',
        iconType: 'arrowRight',
        isDisabled: isInvalid || isWindowDurationZero,
        toolTipContent: isInvalid ? translations.cannotShiftInvalid : translations.nextTooltip,
        'data-test-subj': 'dateRangePickerNextButton',
      });
    }

    return items;
  }, [showShiftArrows, showZoomOut, showZoomIn, isInvalid, isWindowDurationZero]);

  if (options.length === 0) {
    return null;
  }

  return (
    // EuiButtonGroup has a quirky API designed around filter-style selection,
    // not plain action buttons. Ideally we'd replace it with a dedicated button
    // group primitive from EUI once one exists.
    <EuiButtonGroup
      legend={translations.legend}
      type="multi"
      options={options}
      idToSelectedMap={{}}
      onChange={onChange}
      isIconOnly
      buttonSize={compressed ? 's' : 'm'}
      color="text"
      data-test-subj="dateRangePickerTimeWindowButtons"
    />
  );
}

/**
 * Parse a zoom factor value (number or percentage string) into a multiplier.
 * For example: 0.5 stays 0.5, "25%" becomes 0.25.
 */
function parseZoomFactor(value: number | string): number {
  const isPercentage = typeof value === 'string' && value.trim().endsWith('%');
  const parsed =
    typeof value === 'number'
      ? value
      : parseFloat(isPercentage ? value.replace('%', '').trim() : value);

  if (isNaN(parsed)) {
    throw new TypeError('Please provide a valid number or percentage string e.g. "25%"');
  }
  const result = isPercentage ? parsed / 100 : parsed;
  if (result < 0 || result > 1) {
    throw new TypeError('Please provide a `zoomFactor` value between 0 and 1');
  }

  return result;
}

/**
 * Hook providing time window shift and zoom operations.
 *
 * Adapted from EUI's `useEuiTimeWindow` — uses `@elastic/datemath` and
 * `moment` for the same date math, but lives locally to avoid depending
 * on internal EUI exports.
 */
function useTimeWindow(
  start: string,
  end: string,
  apply: (range: { start: string; end: string }) => void,
  options: { zoomFactor: number | string }
) {
  const min = dateMath.parse(start);
  const max = dateMath.parse(end, { roundUp: true });
  const isInvalid = !min || !min.isValid() || !max || !max.isValid();
  const windowDuration = isInvalid ? -1 : max.diff(min);
  const isWindowDurationZero = windowDuration === 0;
  const zoomMultiplier = parseZoomFactor(options.zoomFactor);
  const zoomDelta = windowDuration * (zoomMultiplier / 2);

  const stepForward = useCallback(() => {
    if (isInvalid || isWindowDurationZero) return;
    apply({
      start: moment(max).toISOString(),
      end: moment(max).add(windowDuration, 'ms').toISOString(),
    });
  }, [isInvalid, isWindowDurationZero, max, windowDuration, apply]);

  const stepBackward = useCallback(() => {
    if (isInvalid || isWindowDurationZero) return;
    apply({
      start: moment(min).subtract(windowDuration, 'ms').toISOString(),
      end: moment(min).toISOString(),
    });
  }, [isInvalid, isWindowDurationZero, min, windowDuration, apply]);

  const expandWindow = useCallback(() => {
    if (isInvalid) return;
    const addition = zoomDelta === 0 ? ZOOM_DELTA_FALLBACK_MS : zoomDelta;
    apply({
      start: moment(min).subtract(addition, 'ms').toISOString(),
      end: moment(max).add(addition, 'ms').toISOString(),
    });
  }, [isInvalid, min, max, zoomDelta, apply]);

  const shrinkWindow = useCallback(() => {
    if (isInvalid || isWindowDurationZero) return;
    apply({
      start: moment(min).add(zoomDelta, 'ms').toISOString(),
      end: moment(max).subtract(zoomDelta, 'ms').toISOString(),
    });
  }, [isInvalid, isWindowDurationZero, min, max, zoomDelta, apply]);

  return { stepForward, stepBackward, expandWindow, shrinkWindow, isWindowDurationZero, isInvalid };
}
