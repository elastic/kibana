/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { FC, useCallback } from 'react';
import { Chart, Bullet, BulletProps, Settings } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PaletteOutput } from '@kbn/coloring';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { CustomPaletteState } from '@kbn/charts-plugin/public';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { getOverridesFor } from '@kbn/chart-expressions-common';
import {
  findAccessor,
  getFormatByAccessor,
  isVisDimension,
} from '@kbn/visualizations-plugin/common/utils';
import { i18n } from '@kbn/i18n';
import {
  GaugeRenderProps,
  GaugeLabelMajorMode,
  GaugeLabelMajorModes,
  GaugeColorModes,
  GaugeTicksPositions,
} from '../../common';
import {
  getAccessorsFromArgs,
  getMaxValue,
  getMinValue,
  getValueFromAccessor,
  getSubtypeByGaugeType,
  computeMinMax,
} from './utils';
import { getGaugeIconByType } from './utils/icons';
import './index.scss';
import { GaugeCentralMajorMode, GaugeTicksPosition } from '../../common/types';

import './gauge.scss';
import { useGaugeSizeByType } from './utils/use_gauge_size_by_type';

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

function getTicks(ticksPosition: GaugeTicksPosition, colorBands?: number[]) {
  if (ticksPosition === GaugeTicksPositions.HIDDEN) {
    return [];
  }

  if (ticksPosition === GaugeTicksPositions.BANDS && colorBands) {
    return colorBands && getTicksLabels(colorBands);
  }
}

export const GaugeComponent: FC<GaugeRenderProps> = ({
  data,
  args,
  uiState,
  formatFactory,
  paletteService,
  chartsThemeService,
  renderComplete,
  overrides,
  setChartSize,
}) => {
  const {
    shape: gaugeType,
    palette,
    colorMode,
    labelMinor,
    labelMajor,
    labelMajorMode,
    ticksPosition,
    commonLabel,
  } = args;

  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();
  useGaugeSizeByType(gaugeType, setChartSize);

  const getColor = useCallback(
    (
      value,
      paletteConfig: PaletteOutput<CustomPaletteState>,
      bands: number[],
      percentageMode?: boolean
    ) => {
      const stops = percentageMode ? bands.map((v) => v * 100) : paletteConfig.params?.stops ?? [];

      return paletteService
        .get(paletteConfig?.name ?? 'custom')
        .getColorForValue?.(
          value,
          { ...paletteConfig.params, stops },
          computeMinMax(paletteConfig, bands)
        );
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

  const onRenderChange = useCallback(
    (isRendered: boolean = true) => {
      if (isRendered) {
        renderComplete();
      }
    },
    [renderComplete]
  );

  const accessors = getAccessorsFromArgs(args, data.columns);
  const metricAccessor = accessors?.metric;

  if (!metricAccessor) {
    // Chart is not ready
    return null;
  }

  const metricColumn = data.columns.find((col) => col.id === metricAccessor);

  const chartData = data.rows.filter(
    (v) => typeof v[metricAccessor] === 'number' || Array.isArray(v[metricAccessor])
  );
  const row = chartData?.[0];

  const metricValue = args.metric ? getValueFromAccessor(metricAccessor, row) : undefined;
  const metricName = findAccessor(metricAccessor, data.columns)?.name;

  const icon = getGaugeIconByType(gaugeType);

  if (typeof metricValue !== 'number') {
    return <EmptyPlaceholder icon={icon} renderComplete={onRenderChange} />;
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
        renderComplete={onRenderChange}
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
        renderComplete={onRenderChange}
      />
    );
  }
  const customMetricFormatParams = isVisDimension(args.metric) ? args.metric.format : undefined;
  const tableMetricFormatParams = metricColumn?.meta?.params?.params
    ? metricColumn?.meta?.params
    : undefined;

  const defaultMetricFormatParams = (args.metric &&
    getFormatByAccessor(args.metric, data.columns)) || {
    id: 'number',
    params: {
      pattern: max - min > 5 ? '0,0' : '0,0.0',
    },
  };

  const tickFormatter = formatFactory(
    customMetricFormatParams ?? tableMetricFormatParams ?? defaultMetricFormatParams
  );

  let bands: number[] = (palette?.params as CustomPaletteState)
    ? normalizeBands(palette?.params as CustomPaletteState, { min, max })
    : [min, max];
  let actualValue = metricValue;

  if (args.percentageMode && palette?.params && palette?.params.stops?.length) {
    bands = normalizeBandsLegacy(palette?.params as CustomPaletteState, actualValue);
    actualValue = actualValueToPercentsLegacy(palette?.params as CustomPaletteState, actualValue);
  }

  const ticks = getTicks(ticksPosition, bands);
  const labelMajorTitle = getTitle(labelMajorMode, labelMajor, metricColumn?.name);

  const colorFn = (val: number) => {
    const value = getPreviousSectionValue(val, bands);

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
  };
  const getColorConfig = (): BulletProps['colorBands'] => {
    if (colorMode === GaugeColorModes.NONE)
      return [euiTheme.colors.lightShade, euiTheme.colors.lightShade];

    return {
      steps: bands,
      colors: bands.map((b) => colorFn(b)).slice(1),
    };
  };

  return (
    <div className="gauge__wrapper">
      <Chart {...getOverridesFor(overrides, 'chart')}>
        <Settings
          noResults={<EmptyPlaceholder icon={icon} renderComplete={onRenderChange} />}
          debugState={window._echDebugStateFlag ?? false}
          theme={[{ background: { color: 'transparent' } }]}
          baseTheme={chartBaseTheme}
          ariaLabel={args.ariaLabel}
          ariaUseDefaultSummary={!args.ariaLabel}
          onRenderChange={onRenderChange}
          locale={i18n.getLocale()}
          {...getOverridesFor(overrides, 'settings')}
        />
        <Bullet
          id="bullet"
          subtype={getSubtypeByGaugeType(gaugeType)}
          colorBands={getColorConfig()}
          valueLabels={{
            active: i18n.translate('expressionGauge.tooltip.valueLabel.active', {
              defaultMessage: 'Current',
            }),
            value:
              metricName ||
              i18n.translate('expressionGauge.tooltip.valueLabel.value', {
                defaultMessage: 'Metric',
              }),
            target: i18n.translate('expressionGauge.tooltip.valueLabel.target', {
              defaultMessage: 'Goal',
            }),
          }}
          data={[
            [
              {
                target:
                  goal && goal >= bands[0] && goal <= bands[bands.length - 1] ? goal : undefined,
                value: actualValue,
                title: labelMajorTitle,
                subtitle: labelMinor,
                domain: [min, max],
                ticks: ticks ? () => ticks : undefined,
                valueFormatter: (tickValue) => tickFormatter.convert(tickValue),
                tickFormatter: (tickValue) => tickFormatter.convert(tickValue),
              },
            ],
          ]}
        />
      </Chart>
      {commonLabel && <div className="gauge__label">{commonLabel}</div>}
    </div>
  );
};

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { GaugeComponent as default };
