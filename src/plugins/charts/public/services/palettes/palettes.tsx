/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// @ts-ignore
import chroma from 'chroma-js';
import { i18n } from '@kbn/i18n';
import {
  euiPaletteColorBlind,
  euiPaletteCool,
  euiPaletteGray,
  euiPaletteNegative,
  euiPalettePositive,
  euiPaletteWarm,
  euiPaletteColorBlindBehindText,
} from '@elastic/eui';
import { ChartsPluginSetup } from '../../../../../../src/plugins/charts/public';
import { lightenColor } from './lighten_color';
import { ChartColorConfiguration, PaletteDefinition, SeriesLayer } from './types';
import { LegacyColorsService } from '../legacyColors';

function buildRoundRobinCategoricalWithMappedColors(
  colorService: LegacyColorsService,
  id: string,
  colors: (n: number) => string[],
  behindTextColors?: (n: number) => string[]
): Omit<PaletteDefinition, 'title'> {
  const colorCache: Partial<Record<string, string>> = {};
  function getColor(
    series: SeriesLayer[],
    chartConfiguration: ChartColorConfiguration = { behindText: false }
  ) {
    const colorFromSettings = colorService.mappedColors.getColorFromConfig(series[0].name);
    // default to 7 series at the current level of hierarchy
    const totalSeriesAtDepth = series[0].totalSeriesAtDepth || 7;
    // use total number of cached series colors so far as synthetic rank of current series
    const rankAtDepth =
      (series[0].rankAtDepth ?? Object.keys(colorCache).length) % totalSeriesAtDepth;
    const actualColors = colors(totalSeriesAtDepth);
    const actualBehindTextColors = behindTextColors && behindTextColors(totalSeriesAtDepth);
    let outputColor =
      colorFromSettings ||
      (chartConfiguration.retainColorChoice ? colorCache[series[0].name] : undefined) ||
      actualColors[rankAtDepth];

    colorCache[series[0].name] = outputColor;

    // translate the color to the behind text variant if possible
    if (chartConfiguration.behindText && actualBehindTextColors) {
      const colorIndex = actualColors.findIndex((color) => outputColor === color);
      if (colorIndex !== -1) {
        outputColor = actualBehindTextColors[colorIndex];
      }
    }

    if (!chartConfiguration.maxDepth || chartConfiguration.maxDepth === 1) {
      return outputColor;
    }

    return lightenColor(outputColor, series.length, chartConfiguration.maxDepth);
  }
  return {
    id,
    getColor,
    getColors: colors,
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
  function getColor(series: SeriesLayer[], chartConfiguration: ChartColorConfiguration = {}) {
    colors.mappedColors.mapKeys([series[0].name]);
    const outputColor = colors.mappedColors.get(series[0].name);

    if (!chartConfiguration.maxDepth || chartConfiguration.maxDepth === 1) {
      return outputColor;
    }

    return lightenColor(outputColor, series.length, chartConfiguration.maxDepth);
  }
  return {
    id: 'kibana_palette',
    getColor,
    getColors: () => colors.seedColors.slice(0, 10),
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

function buildCustomPalette(): PaletteDefinition {
  const colorCache: Partial<Record<string, string>> = {};
  return {
    id: 'custom',
    getColor: (
      series: SeriesLayer[],
      chartConfiguration: ChartColorConfiguration = { behindText: false },
      { colors, gradient }: { colors: string[]; gradient: boolean }
    ) => {
      const actualColors = gradient
        ? chroma.scale(colors).colors(series[0].totalSeriesAtDepth || 7)
        : colors;
      const outputColor =
        (chartConfiguration.retainColorChoice ? colorCache[series[0].name] : undefined) ||
        actualColors[
          (series[0].rankAtDepth ?? Object.keys(colorCache).length) % actualColors.length
        ];

      colorCache[series[0].name] = outputColor;

      if (!chartConfiguration.maxDepth || chartConfiguration.maxDepth === 1) {
        return outputColor;
      }

      return lightenColor(outputColor, series.length, chartConfiguration.maxDepth);
    },
    internal: true,
    title: i18n.translate('charts.palettes.customLabel', { defaultMessage: 'custom' }),
    getColors: (size: number, { colors, gradient }: { colors: string[]; gradient: boolean }) => {
      return gradient ? chroma.scale(colors).colors(size) : colors;
    },
    toExpression: ({ colors, gradient }: { colors: string[]; gradient: boolean }) => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'palette',
          arguments: {
            color: colors,
            gradient: [gradient],
          },
        },
      ],
    }),
  } as PaletteDefinition<unknown>;
}

export const buildPalettes: (
  legacyColorsService: LegacyColorsService
) => Record<string, PaletteDefinition> = (legacyColorsService) => {
  const buildRoundRobinCategorical = (
    id: string,
    colors: (n: number) => string[],
    behindTextColors?: (n: number) => string[]
  ) => {
    return buildRoundRobinCategoricalWithMappedColors(
      legacyColorsService,
      id,
      colors,
      behindTextColors
    );
  };
  return {
    default: {
      title: i18n.translate('charts.palettes.defaultPaletteLabel', {
        defaultMessage: 'default',
      }),
      ...buildRoundRobinCategorical(
        'default',
        () => euiPaletteColorBlind(),
        () => euiPaletteColorBlindBehindText()
      ),
    },
    kibana_palette: {
      title: i18n.translate('charts.palettes.kibanaPaletteLabel', {
        defaultMessage: 'legacy',
      }),
      ...buildSyncedKibanaPalette(legacyColorsService),
    },
    negative: {
      title: i18n.translate('charts.palettes.negativeLabel', { defaultMessage: 'negative' }),
      ...buildRoundRobinCategorical('negative', euiPaletteNegative),
    },
    positive: {
      title: i18n.translate('charts.palettes.positiveLabel', { defaultMessage: 'positive' }),
      ...buildRoundRobinCategorical('positive', euiPalettePositive),
    },
    cool: {
      title: i18n.translate('charts.palettes.coolLabel', { defaultMessage: 'cool' }),
      ...buildRoundRobinCategorical('cool', euiPaletteCool),
    },
    warm: {
      title: i18n.translate('charts.palettes.warmLabel', { defaultMessage: 'warm' }),
      ...buildRoundRobinCategorical('warm', euiPaletteWarm),
    },
    gray: {
      title: i18n.translate('charts.palettes.grayLabel', { defaultMessage: 'gray' }),
      ...buildRoundRobinCategorical('gray', euiPaletteGray),
    },
    custom: buildCustomPalette() as PaletteDefinition<unknown>,
  };
};
