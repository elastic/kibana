/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chroma from 'chroma-js';
import { i18n } from '@kbn/i18n';
import {
  euiPaletteColorBlind,
  euiPaletteCool,
  euiPaletteGray,
  euiPaletteRed,
  euiPaletteGreen,
  euiPaletteWarm,
  euiPaletteForStatus,
  euiPaletteForTemperature,
  euiPaletteComplementary,
  euiPaletteColorBlindBehindText,
} from '@elastic/eui';
import type { ChartColorConfiguration, PaletteDefinition, SeriesLayer } from '@kbn/coloring';
import { flatten, zip } from 'lodash';
import { createColorPalette as createLegacyColorPalette } from '../..';
import { lightenColor } from './lighten_color';
import { MappedColors } from '../mapped_colors';
import { workoutColorForValue } from './helpers';

function buildRoundRobinCategoricalWithMappedColors(
  id = 'default',
  colors = euiPaletteColorBlind({ rotations: 2 }),
  behindTextColors = euiPaletteColorBlindBehindText({ rotations: 2 })
): Omit<PaletteDefinition, 'title'> {
  const behindTextColorMap: Record<string, string> = Object.fromEntries(
    zip(colors, behindTextColors)
  );
  const mappedColors = new MappedColors((num: number) => {
    return flatten(new Array(Math.ceil(num / 10)).fill(colors)).map((color) => color.toLowerCase());
  });
  function getColor(
    series: SeriesLayer[],
    chartConfiguration: ChartColorConfiguration = { behindText: false }
  ) {
    let outputColor: string;
    if (chartConfiguration.syncColors) {
      const colorKey = series[0].name;
      mappedColors.mapKeys([colorKey]);
      const mappedColor = mappedColors.get(colorKey);
      outputColor = chartConfiguration.behindText ? behindTextColorMap[mappedColor] : mappedColor;
    } else {
      outputColor = chartConfiguration.behindText
        ? behindTextColors[series[0].rankAtDepth % behindTextColors.length]
        : colors[series[0].rankAtDepth % colors.length];
    }

    if (!chartConfiguration.maxDepth || chartConfiguration.maxDepth === 1) {
      return outputColor;
    }

    return lightenColor(outputColor, series.length, chartConfiguration.maxDepth);
  }
  return {
    id,
    getCategoricalColor: getColor,
    getCategoricalColors: () => colors.slice(0, 10),
    toExpression: () => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'system_palette',
          arguments: {
            name: [id],
          },
        },
      ],
    }),
  };
}

function buildGradient(
  id: string,
  colors: (n: number) => string[]
): Omit<PaletteDefinition, 'title'> {
  function getColor(
    series: SeriesLayer[],
    chartConfiguration: ChartColorConfiguration = { behindText: false }
  ) {
    const totalSeriesAtDepth = series[0].totalSeriesAtDepth;
    const rankAtDepth = series[0].rankAtDepth;
    const actualColors = colors(totalSeriesAtDepth);
    const outputColor = actualColors[rankAtDepth];

    if (!chartConfiguration.maxDepth || chartConfiguration.maxDepth === 1) {
      return outputColor;
    }

    return lightenColor(outputColor, series.length, chartConfiguration.maxDepth);
  }
  return {
    id,
    getCategoricalColor: getColor,
    getCategoricalColors: colors,
    canDynamicColoring: true,
    toExpression: () => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'system_palette',
          arguments: {
            name: [id],
          },
        },
      ],
    }),
  };
}

function buildCustomPalette(): PaletteDefinition {
  return {
    id: 'custom',
    getColorForValue: (
      value,
      params: {
        colors: string[];
        range: 'number' | 'percent';
        continuity: 'above' | 'below' | 'none' | 'all';
        gradient: boolean;
        /** Stops values mark where colors end (non-inclusive value) */
        stops: number[];
        /** Important: specify rangeMin/rangeMax if custom stops are defined! */
        rangeMax: number;
        rangeMin: number;
      },
      dataBounds
    ) => {
      return workoutColorForValue(value, params, dataBounds);
    },
    getCategoricalColor: (
      series: SeriesLayer[],
      chartConfiguration: ChartColorConfiguration = { behindText: false },
      { colors, gradient }: { colors: string[]; gradient: boolean }
    ) => {
      const actualColors = gradient
        ? chroma.scale(colors).colors(series[0].totalSeriesAtDepth)
        : colors;
      const outputColor = actualColors[series[0].rankAtDepth % actualColors.length];

      if (!chartConfiguration.maxDepth || chartConfiguration.maxDepth === 1) {
        return outputColor;
      }

      return lightenColor(outputColor, series.length, chartConfiguration.maxDepth);
    },
    internal: true,
    title: i18n.translate('charts.palettes.customLabel', { defaultMessage: 'Custom' }),
    getCategoricalColors: (
      size: number,
      {
        colors,
        gradient,
        stepped,
        stops,
      }: { colors: string[]; gradient: boolean; stepped: boolean; stops: number[] } = {
        colors: [],
        gradient: false,
        stepped: false,
        stops: [],
      }
    ) => {
      if (stepped) {
        const range = stops[stops.length - 1] - stops[0];
        const offset = stops[0];
        const finalStops = [...stops.map((stop) => (stop - offset) / range)];
        return chroma.scale(colors).domain(finalStops).colors(size);
      }
      return gradient ? chroma.scale(colors).colors(size) : colors;
    },
    canDynamicColoring: false,
    toExpression: ({
      colors,
      gradient,
      stops = [],
      rangeMax,
      rangeMin,
      rangeType = 'percent',
      continuity = 'above',
      reverse = false,
    }: {
      colors: string[];
      gradient: boolean;
      stops: number[];
      rangeMax?: number;
      rangeMin?: number;
      rangeType: 'percent' | 'number';
      continuity?: 'all' | 'none' | 'above' | 'below';
      reverse?: boolean;
    }) => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'palette',
          arguments: {
            color: colors,
            gradient: [gradient],
            reverse: [reverse],
            continuity: [continuity],
            stop: stops,
            range: [rangeType],
            rangeMax: rangeMax == null ? [] : [rangeMax],
            rangeMin: rangeMin == null ? [] : [rangeMin],
          },
        },
      ],
    }),
  } as PaletteDefinition<unknown>;
}

export const buildPalettes = (): Record<string, PaletteDefinition> => ({
  default: {
    title: i18n.translate('charts.palettes.defaultPaletteLabel', { defaultMessage: 'Default' }),
    ...buildRoundRobinCategoricalWithMappedColors(),
  },
  status: {
    title: i18n.translate('charts.palettes.statusLabel', { defaultMessage: 'Status' }),
    ...buildGradient('status', euiPaletteForStatus),
  },
  temperature: {
    title: i18n.translate('charts.palettes.temperatureLabel', { defaultMessage: 'Temperature' }),
    ...buildGradient('temperature', euiPaletteForTemperature),
  },
  complementary: {
    title: i18n.translate('charts.palettes.complementaryLabel', {
      defaultMessage: 'Complementary',
    }),
    ...buildGradient('complementary', euiPaletteComplementary),
  },
  negative: {
    title: i18n.translate('charts.palettes.negativeLabel', { defaultMessage: 'Negative' }),
    ...buildGradient('negative', euiPaletteRed),
  },
  positive: {
    title: i18n.translate('charts.palettes.positiveLabel', { defaultMessage: 'Positive' }),
    ...buildGradient('positive', euiPaletteGreen),
  },
  cool: {
    title: i18n.translate('charts.palettes.coolLabel', { defaultMessage: 'Cool' }),
    ...buildGradient('cool', euiPaletteCool),
  },
  warm: {
    title: i18n.translate('charts.palettes.warmLabel', { defaultMessage: 'Warm' }),
    ...buildGradient('warm', euiPaletteWarm),
  },
  gray: {
    title: i18n.translate('charts.palettes.grayLabel', { defaultMessage: 'Gray' }),
    ...buildGradient('gray', euiPaletteGray),
  },
  kibana_palette: {
    title: i18n.translate('charts.palettes.kibanaPaletteLabel', {
      defaultMessage: 'Compatibility',
    }),
    ...buildRoundRobinCategoricalWithMappedColors('kibana_palette', createLegacyColorPalette(20)),
  },
  custom: buildCustomPalette() as PaletteDefinition<unknown>,
});
