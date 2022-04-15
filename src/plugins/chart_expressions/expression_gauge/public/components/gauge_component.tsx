/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, memo, useCallback } from 'react';
import { Chart, Goal, Settings } from '@elastic/charts';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PaletteOutput } from '@kbn/coloring';
import { FieldFormat } from '../../../../field_formats/common';
import type { CustomPaletteState } from '../../../../charts/public';
import { EmptyPlaceholder } from '../../../../charts/public';
import { isVisDimension } from '../../../../visualizations/common/utils';
import {
  GaugeRenderProps,
  GaugeLabelMajorMode,
  GaugeTicksPosition,
  GaugeLabelMajorModes,
  GaugeColorModes,
  GaugeShapes,
} from '../../common';
import { GaugeTicksPositions } from '../../common';
import {
  getAccessorsFromArgs,
  getIcons,
  getMaxValue,
  getMinValue,
  getValueFromAccessor,
  getSubtypeByGaugeType,
  getGoalConfig,
} from './utils';
import './index.scss';
import { GaugeCentralMajorMode } from '../../common/types';
import { isBulletShape, isRoundShape } from '../../common/utils';

import './gauge.scss';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

const TRANSPARENT = `rgba(255,255,255,0)`;

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

const toPercents = (min: number, max: number) => (v: number) => (v - min) / (max - min);

function normalizeBandsLegacy({ colors, stops }: CustomPaletteState, value: number) {
  const min = stops[0];
  const max = stops[stops.length - 1];
  const convertToPercents = toPercents(min, max);
  const normalizedStops = stops.map(convertToPercents);

  if (max < value) {
    normalizedStops.push(convertToPercents(value));
  }

  return normalizedStops;
}

function actualValueToPercentsLegacy({ stops }: CustomPaletteState, value: number) {
  const min = stops[0];
  const max = stops[stops.length - 1];
  const convertToPercents = toPercents(min, max);
  return convertToPercents(value);
}

function getTitle(
  majorMode?: GaugeLabelMajorMode | GaugeCentralMajorMode,
  major?: string,
  fallbackTitle?: string
) {
  if (majorMode === GaugeLabelMajorModes.NONE) {
    return '';
  }

  if (majorMode === GaugeLabelMajorModes.AUTO) {
    return fallbackTitle || '';
  }
  return major || fallbackTitle || '';
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
  colorBands?: number[],
  percentageMode?: boolean
) {
  if (ticksPosition === GaugeTicksPositions.HIDDEN) {
    return [];
  }

  if (ticksPosition === GaugeTicksPositions.BANDS && colorBands) {
    return colorBands && getTicksLabels(colorBands);
  }

  const TICKS_NO = 3;
  const min = Math.min(...(colorBands || []), ...range);
  const max = Math.max(...(colorBands || []), ...range);
  const step = (max - min) / TICKS_NO;

  const ticks = [
    ...Array(TICKS_NO)
      .fill(null)
      .map((_, i) => Number((min + step * i).toFixed(2))),
    max,
  ];
  const convertToPercents = toPercents(min, max);
  return percentageMode ? ticks.map(convertToPercents) : ticks;
}

const calculateRealRangeValueMin = (
  relativeRangeValue: number,
  { min, max }: { min: number; max: number }
) => {
  if (isFinite(relativeRangeValue)) {
    return relativeRangeValue * ((max - min) / 100);
  }
  return min;
};

const calculateRealRangeValueMax = (
  relativeRangeValue: number,
  { min, max }: { min: number; max: number }
) => {
  if (isFinite(relativeRangeValue)) {
    return relativeRangeValue * ((max - min) / 100);
  }

  return max;
};

const getPreviousSectionValue = (value: number, bands: number[]) => {
  // bands value is equal to the stop. The purpose of this value is coloring the previous section, which is smaller, then the band.
  // So, the smaller value should be taken. For the first element -1, for the next - middle value of the previous section.

  let prevSectionValue = value - 1;
  const valueIndex = bands.indexOf(value);
  const prevBand = bands[valueIndex - 1];
  const curBand = bands[valueIndex];
  if (valueIndex > 0) {
    prevSectionValue = value - (curBand - prevBand) / 2;
  }

  return prevSectionValue;
};

export const GaugeComponent: FC<GaugeRenderProps> = memo(
  ({ data, args, uiState, formatFactory, paletteService, chartsThemeService }) => {
    const {
      shape: gaugeType,
      palette,
      colorMode,
      labelMinor,
      labelMajor,
      labelMajorMode,
      centralMajor,
      centralMajorMode,
      ticksPosition,
      commonLabel,
    } = args;

    const getColor = useCallback(
      (
        value,
        paletteConfig: PaletteOutput<CustomPaletteState>,
        bands: number[],
        percentageMode?: boolean
      ) => {
        const { rangeMin, rangeMax, range }: CustomPaletteState = paletteConfig.params!;
        const minRealValue = bands[0];
        const maxRealValue = bands[bands.length - 1];
        let min = rangeMin;
        let max = rangeMax;

        let stops = paletteConfig.params?.stops ?? [];

        if (percentageMode) {
          stops = bands.map((v) => v * 100);
        }

        if (range === 'percent') {
          const minMax = { min: minRealValue, max: maxRealValue };

          min = calculateRealRangeValueMin(min, minMax);
          max = calculateRealRangeValueMax(max, minMax);
        }

        return paletteService
          .get(paletteConfig?.name ?? 'custom')
          .getColorForValue?.(value, { ...paletteConfig.params, stops }, { min, max });
      },
      [paletteService]
    );

    // Legacy chart was not formatting numbers, when was forming overrideColors.
    // To support the behavior of the color overriding, it is required to skip all the formatting, except percent.
    const overrideColor = useCallback(
      (value: number, bands: number[], formatter?: FieldFormat) => {
        const overrideColors = uiState?.get('vis.colors') ?? {};
        const valueIndex = bands.findIndex((band, index, allBands) => {
          if (index === allBands.length - 1) {
            return false;
          }

          return value >= band && value < allBands[index + 1];
        });

        if (valueIndex < 0 || valueIndex === bands.length - 1) {
          return undefined;
        }
        const curValue = bands[valueIndex];
        const nextValue = bands[valueIndex + 1];

        return overrideColors[
          `${formatter?.convert(curValue) ?? curValue} - ${
            formatter?.convert(nextValue) ?? nextValue
          }`
        ];
      },
      [uiState]
    );

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

    const icon = getIcons(gaugeType);

    if (typeof metricValue !== 'number') {
      return <EmptyPlaceholder icon={icon} />;
    }

    const goal = accessors.goal ? getValueFromAccessor(accessors.goal, row) : undefined;
    const min = getMinValue(row, accessors, palette?.params, args.respectRanges);
    const max = getMaxValue(row, accessors, palette?.params, args.respectRanges);

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
    const customMetricFormatParams = isVisDimension(args.metric) ? args.metric.format : undefined;
    const tableMetricFormatParams = metricColumn?.meta?.params?.params
      ? metricColumn?.meta?.params
      : undefined;

    const defaultMetricFormatParams = {
      id: 'number',
      params: {
        pattern: max - min > 5 ? `0,0` : `0,0.0`,
      },
    };

    const tickFormatter = formatFactory(
      customMetricFormatParams ?? tableMetricFormatParams ?? defaultMetricFormatParams
    );

    let bands: number[] = (palette?.params as CustomPaletteState)
      ? normalizeBands(palette?.params as CustomPaletteState, { min, max })
      : [min, max];

    // TODO: format in charts
    let actualValue = Math.round(Math.min(Math.max(metricValue, min), max) * 1000) / 1000;
    const totalTicks = getTicks(ticksPosition, [min, max], bands, args.percentageMode);
    const ticks =
      gaugeType === GaugeShapes.CIRCLE ? totalTicks.slice(0, totalTicks.length - 1) : totalTicks;

    if (args.percentageMode && palette?.params && palette?.params.stops?.length) {
      bands = normalizeBandsLegacy(palette?.params as CustomPaletteState, actualValue);
      actualValue = actualValueToPercentsLegacy(palette?.params as CustomPaletteState, actualValue);
    }

    const goalConfig = getGoalConfig(gaugeType);

    const labelMajorTitle = getTitle(labelMajorMode, labelMajor, metricColumn?.name);

    // added extra space for nice rendering
    const majorExtraSpaces = isBulletShape(gaugeType) ? '   ' : '';
    const minorExtraSpaces = isBulletShape(gaugeType) ? '  ' : '';

    const extraTitles = isRoundShape(gaugeType)
      ? {
          centralMinor: tickFormatter.convert(actualValue),
          centralMajor: getTitle(centralMajorMode, centralMajor, metricColumn?.name),
        }
      : {};

    return (
      <div className="gauge__wrapper">
        <Chart>
          <Settings
            debugState={window._echDebugStateFlag ?? false}
            theme={[{ background: { color: 'transparent' } }, chartTheme]}
            ariaLabel={args.ariaLabel}
            ariaUseDefaultSummary={!args.ariaLabel}
          />
          <Goal
            id="goal"
            subtype={getSubtypeByGaugeType(gaugeType)}
            base={bands[0]}
            target={goal && goal >= bands[0] && goal <= bands[bands.length - 1] ? goal : undefined}
            actual={actualValue}
            tickValueFormatter={({ value: tickValue }) => tickFormatter.convert(tickValue)}
            tooltipValueFormatter={(tooltipValue) => tickFormatter.convert(tooltipValue)}
            bands={bands}
            ticks={ticks}
            domain={{ min, max }}
            bandFillColor={
              colorMode === GaugeColorModes.PALETTE
                ? (val) => {
                    const value = getPreviousSectionValue(val.value, bands);

                    const overridedColor = overrideColor(
                      value,
                      args.percentageMode ? bands : args.palette?.params?.stops ?? [],
                      args.percentageMode ? tickFormatter : undefined
                    );

                    if (overridedColor) {
                      return overridedColor;
                    }
                    return args.palette
                      ? getColor(value, args.palette, bands, args.percentageMode) ?? TRANSPARENT
                      : TRANSPARENT;
                  }
                : () => TRANSPARENT
            }
            labelMajor={labelMajorTitle ? `${labelMajorTitle}${majorExtraSpaces}` : labelMajorTitle}
            labelMinor={labelMinor ? `${labelMinor}${minorExtraSpaces}` : ''}
            {...extraTitles}
            {...goalConfig}
          />
        </Chart>
        {commonLabel && <div className="gauge__label">{commonLabel}</div>}
      </div>
    );
  }
);

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { GaugeComponent as default };
