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
import { getKbnPalettes, type IKbnPalette } from '@kbn/palettes';
import type { ChartColorConfiguration, PaletteDefinition, SeriesLayer } from '@kbn/coloring';
import { flatten, zip } from 'lodash';
import { CoreTheme } from '@kbn/core/public';
import { ChartsPluginSetup, createColorPalette as createLegacyColorPalette } from '../..';
import { lightenColor } from './lighten_color';
import { LegacyColorsService } from '../legacy_colors';
import { MappedColors } from '../mapped_colors';
import { workoutColorForValue } from './helpers';

function buildRoundRobinCategoricalWithMappedColors(
  id: string,
  colors: string[],
  behindTextColors?: string[]
): Omit<PaletteDefinition, 'title'> {
  const behindTextColorMap: Record<string, string> = Object.fromEntries(
    zip(colors, behindTextColors)
  );
  const mappedColors = new MappedColors(undefined, (num: number) => {
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
      outputColor =
        chartConfiguration.behindText && behindTextColors
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
    getCategoricalColors: (size: number) => colors.slice(0, size),
    toExpression: () => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'system_palette',
          arguments: {
            name: ['default'],
          },
        },
      ],
    }),
  };
}

function buildGradient(id: string, palette: IKbnPalette): PaletteDefinition {
  function getColor(
    series: SeriesLayer[],
    chartConfiguration: ChartColorConfiguration = { behindText: false }
  ) {
    const totalSeriesAtDepth = series[0].totalSeriesAtDepth;
    const rankAtDepth = series[0].rankAtDepth;
    const actualColors = palette.colors(totalSeriesAtDepth);
    const outputColor = actualColors[rankAtDepth];

    if (!chartConfiguration.maxDepth || chartConfiguration.maxDepth === 1) {
      return outputColor;
    }

    return lightenColor(outputColor, series.length, chartConfiguration.maxDepth);
  }
  return {
    id,
    title: palette.name,
    getCategoricalColor: getColor,
    getCategoricalColors: palette.colors,
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

function buildSyncedKibanaPalette(
  colors: ChartsPluginSetup['legacyColors']
): Omit<PaletteDefinition, 'title'> {
  const staticColors = createLegacyColorPalette(20);
  function getColor(series: SeriesLayer[], chartConfiguration: ChartColorConfiguration = {}) {
    let outputColor: string;
    if (chartConfiguration.syncColors) {
      colors.mappedColors.mapKeys([series[0].name]);
      outputColor = colors.mappedColors.get(series[0].name);
    } else {
      const configColor = colors.mappedColors.getColorFromConfig(series[0].name);
      outputColor = configColor || staticColors[series[0].rankAtDepth % staticColors.length];
    }

    if (!chartConfiguration.maxDepth || chartConfiguration.maxDepth === 1) {
      return outputColor;
    }

    return lightenColor(outputColor, series.length, chartConfiguration.maxDepth);
  }
  return {
    id: 'kibana_palette',
    getCategoricalColor: getColor,
    getCategoricalColors: () => colors.seedColors.slice(0, 10),
    toExpression: () => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'system_palette',
          arguments: {
            name: ['kibana_palette'],
          },
        },
      ],
    }),
  };
}

function buildCustomPalette(): PaletteDefinition<unknown> {
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

export const buildPalettes = (
  legacyColorsService: LegacyColorsService,
  theme: CoreTheme
): Record<string, PaletteDefinition> => {
  const kbnPalettes = getKbnPalettes(theme);
  const defaultPalette = kbnPalettes.get('default');
  return {
    default: {
      title: defaultPalette.name,
      ...buildRoundRobinCategoricalWithMappedColors(
        'default',
        // defaultPalette.id,
        defaultPalette.colors(),
        kbnPalettes.query('behindText')?.colors()
      ),
    },
    status: buildGradient('status', kbnPalettes.get('status')),
    temperature: buildGradient('temperature', kbnPalettes.get('temperature')),
    complementary: buildGradient('complementary', kbnPalettes.get('complementary')),
    negative: buildGradient('negative', kbnPalettes.get('red')),
    positive: buildGradient('positive', kbnPalettes.get('green')),
    cool: buildGradient('cool', kbnPalettes.get('cool')),
    warm: buildGradient('warm', kbnPalettes.get('warm')),
    gray: buildGradient('gray', kbnPalettes.get('gray')),
    kibana_palette: {
      title: i18n.translate('charts.palettes.kibanaPaletteLabel', {
        defaultMessage: 'Compatibility',
      }),
      ...buildSyncedKibanaPalette(legacyColorsService),
    },
    custom: buildCustomPalette(),
  };
};
