/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, memo } from 'react';
import { Chart, Goal, Settings } from '@elastic/charts';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CustomPaletteState } from '../../../../charts/public';
import { EmptyPlaceholder } from '../../../../charts/public';
import {
  GaugeRenderProps,
  GaugeLabelMajorMode,
  GaugeTicksPosition,
  GaugeLabelMajorModes,
  GaugeColorModes,
} from '../../common';
import { GaugeShapes, GaugeTicksPositions } from '../../common';
import { GaugeIconVertical, GaugeIconHorizontal } from './gauge_icon';
import { getAccessorsFromArgs, getMaxValue, getMinValue, getValueFromAccessor } from './utils';
import './index.scss';
declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

function normalizeColors(
  { colors, stops, range, rangeMin, rangeMax }: CustomPaletteState,
  min: number,
  max: number
) {
  if (!colors) {
    return;
  }
  const colorsOutOfRangeSmaller = Math.max(
    stops.filter((stop, i) => (range === 'percent' ? stop < 0 : stop < min)).length,
    0
  );
  let updatedColors = colors.slice(colorsOutOfRangeSmaller);

  let correctMin = rangeMin;
  let correctMax = rangeMax;
  if (range === 'percent') {
    correctMin = min + rangeMin * ((max - min) / 100);
    correctMax = min + rangeMax * ((max - min) / 100);
  }

  if (correctMin > min && isFinite(correctMin)) {
    updatedColors = [`rgba(255,255,255,0)`, ...updatedColors];
  }

  if (correctMax < max && isFinite(correctMax)) {
    updatedColors = [...updatedColors, `rgba(255,255,255,0)`];
  }

  return updatedColors;
}

function normalizeBands(
  { colors, stops, range, rangeMax, rangeMin }: CustomPaletteState,
  { min, max }: { min: number; max: number }
) {
  if (!stops.length) {
    const step = (max - min) / colors.length;
    return [min, ...colors.map((_, i) => min + (i + 1) * step)];
  }
  let firstRanges = [min];
  let lastRanges = [max];
  let correctMin = rangeMin;
  let correctMax = rangeMax;
  if (range === 'percent') {
    correctMin = min + rangeMin * ((max - min) / 100);
    correctMax = min + rangeMax * ((max - min) / 100);
  }

  if (correctMin > min && isFinite(correctMin)) {
    firstRanges = [min, correctMin];
  }

  if (correctMax < max && isFinite(correctMax)) {
    lastRanges = [correctMax, max];
  }

  if (range === 'percent') {
    const filteredStops = stops.filter((stop) => stop > 0 && stop < 100);
    return [
      ...firstRanges,
      ...filteredStops.map((step) => min + step * ((max - min) / 100)),
      ...lastRanges,
    ];
  }
  const orderedStops = stops.filter((stop, i) => stop < max && stop > min);
  return [...firstRanges, ...orderedStops, ...lastRanges];
}

function getTitle(
  labelMajorMode: GaugeLabelMajorMode,
  labelMajor?: string,
  fallbackTitle?: string
) {
  if (labelMajorMode === GaugeLabelMajorModes.NONE) {
    return '';
  }

  if (labelMajorMode === GaugeLabelMajorModes.AUTO) {
    return `${fallbackTitle || ''}   `; // added extra space for nice rendering
  }
  return `${labelMajor || fallbackTitle || ''}   `; // added extra space for nice rendering
}

// TODO: once charts handle not displaying labels when there's no space for them, it's safe to remove this
function getTicksLabels(baseStops: number[]) {
  const tenPercentRange = (Math.max(...baseStops) - Math.min(...baseStops)) * 0.1;
  const lastIndex = baseStops.length - 1;
  return baseStops.filter((stop, i) => {
    if (i === 0 || i === lastIndex) {
      return true;
    }

    return !(
      stop - baseStops[i - 1] < tenPercentRange || baseStops[lastIndex] - stop < tenPercentRange
    );
  });
}

function getTicks(
  ticksPosition: GaugeTicksPosition,
  range: [number, number],
  colorBands?: number[]
) {
  if (ticksPosition === GaugeTicksPositions.BANDS && colorBands) {
    return colorBands && getTicksLabels(colorBands);
  }
  const TICKS_NO = 3;
  const min = Math.min(...(colorBands || []), ...range);
  const max = Math.max(...(colorBands || []), ...range);
  const step = (max - min) / TICKS_NO;
  return [
    ...Array(TICKS_NO)
      .fill(null)
      .map((_, i) => Number((min + step * i).toFixed(2))),
    max,
  ];
}

export const GaugeComponent: FC<GaugeRenderProps> = memo(
  ({ data, args, formatFactory, chartsThemeService }) => {
    const {
      shape: subtype,
      palette,
      colorMode,
      labelMinor,
      labelMajor,
      labelMajorMode,
      ticksPosition,
    } = args;
    const table = data;
    const accessors = getAccessorsFromArgs(args, table.columns);

    if (!accessors || !accessors.metric) {
      // Chart is not ready
      return null;
    }

    const chartTheme = chartsThemeService.useChartsTheme();

    const metricColumn = table.columns.find((col) => col.id === accessors.metric);

    const chartData = table.rows.filter(
      (v) => typeof v[accessors.metric!] === 'number' || Array.isArray(v[accessors.metric!])
    );
    const row = chartData?.[0];

    const metricValue = args.metric ? getValueFromAccessor(accessors.metric, row) : undefined;

    const icon =
      subtype === GaugeShapes.HORIZONTAL_BULLET ? GaugeIconHorizontal : GaugeIconVertical;

    if (typeof metricValue !== 'number') {
      return <EmptyPlaceholder icon={icon} />;
    }

    const goal = accessors.goal ? getValueFromAccessor(accessors.goal, row) : undefined;
    const min = getMinValue(row, accessors);
    const max = getMaxValue(row, accessors);

    if (min === max) {
      return (
        <EmptyPlaceholder
          icon={icon}
          message={
            <FormattedMessage
              id="expressionGauge.renderer.chartCannotRenderEqual"
              defaultMessage="Minimum and maximum values may not be equal"
            />
          }
        />
      );
    }

    if (min > max) {
      return (
        <EmptyPlaceholder
          icon={icon}
          message={
            <FormattedMessage
              id="expressionGauge.renderer.chartCannotRenderMinGreaterMax"
              defaultMessage="Minimum value may not be greater than maximum value"
            />
          }
        />
      );
    }

    const tickFormatter = formatFactory(
      metricColumn?.meta?.params?.params
        ? metricColumn?.meta?.params
        : {
            id: 'number',
            params: {
              pattern: max - min > 5 ? `0,0` : `0,0.0`,
            },
          }
    );
    const colors = palette?.params?.colors ? normalizeColors(palette.params, min, max) : undefined;
    const bands: number[] = (palette?.params as CustomPaletteState)
      ? normalizeBands(args.palette?.params as CustomPaletteState, { min, max })
      : [min, max];

    // TODO: format in charts
    const formattedActual = Math.round(Math.min(Math.max(metricValue, min), max) * 1000) / 1000;

    return (
      <Chart>
        <Settings
          debugState={window._echDebugStateFlag ?? false}
          theme={chartTheme}
          ariaLabel={args.ariaLabel}
          ariaUseDefaultSummary={!args.ariaLabel}
        />
        <Goal
          id="goal"
          subtype={subtype}
          base={bands[0]}
          target={goal && goal >= bands[0] && goal <= bands[bands.length - 1] ? goal : undefined}
          actual={formattedActual}
          tickValueFormatter={({ value: tickValue }) => tickFormatter.convert(tickValue)}
          bands={bands}
          ticks={getTicks(ticksPosition, [min, max], bands)}
          bandFillColor={
            colorMode === GaugeColorModes.PALETTE && colors
              ? (val) => {
                  const index = bands && bands.indexOf(val.value) - 1;
                  return colors && index >= 0 && colors[index]
                    ? colors[index]
                    : val.value <= bands[0]
                    ? colors[0]
                    : colors[colors.length - 1];
                }
              : () => `rgba(255,255,255,0)`
          }
          labelMajor={getTitle(labelMajorMode, labelMajor, metricColumn?.name)}
          labelMinor={labelMinor ? labelMinor + '  ' : ''} // added extra space for nice rendering
        />
      </Chart>
    );
  }
);

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { GaugeComponent as default };
