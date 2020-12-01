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
import { IUiSettingsClient } from 'src/core/public';
import {
  euiPaletteColorBlind,
  euiPaletteCool,
  euiPaletteGray,
  euiPaletteNegative,
  euiPalettePositive,
  euiPaletteWarm,
  euiPaletteColorBlindBehindText,
  euiPaletteForStatus,
  euiPaletteForTemperature,
  euiPaletteComplimentary,
} from '@elastic/eui';
import { ChartsPluginSetup } from '../../../../../../src/plugins/charts/public';
import { lightenColor } from './lighten_color';
import { ChartColorConfiguration, PaletteDefinition, SeriesLayer } from './types';
import { LegacyColorsService } from '../legacy_colors';

function buildRoundRobinCategoricalWithMappedColors(): Omit<PaletteDefinition, 'title'> {
  const colors = euiPaletteColorBlind({ rotations: 2 });
  const behindTextColors = euiPaletteColorBlindBehindText({ rotations: 2 });
  function getColor(
    series: SeriesLayer[],
    chartConfiguration: ChartColorConfiguration = { behindText: false }
  ) {
    const outputColor = chartConfiguration.behindText
      ? behindTextColors[series[0].rankAtDepth % behindTextColors.length]
      : colors[series[0].rankAtDepth % colors.length];

    if (!chartConfiguration.maxDepth || chartConfiguration.maxDepth === 1) {
      return outputColor;
    }

    return lightenColor(outputColor, series.length, chartConfiguration.maxDepth);
  }
  return {
    id: 'default',
    getColor,
    getColors: () => euiPaletteColorBlind(),
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
  return {
    id: 'custom',
    getColor: (
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
  uiSettings: IUiSettingsClient,
  legacyColorsService: LegacyColorsService
) => Record<string, PaletteDefinition> = (uiSettings, legacyColorsService) => {
  return {
    default: {
      title: i18n.translate('charts.palettes.defaultPaletteLabel', {
        defaultMessage: 'Default',
      }),
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
    complimentary: {
      title: i18n.translate('charts.palettes.complimentaryLabel', {
        defaultMessage: 'Complimentary',
      }),
      ...buildGradient('complimentary', euiPaletteComplimentary),
    },
    negative: {
      title: i18n.translate('charts.palettes.negativeLabel', { defaultMessage: 'Negative' }),
      ...buildGradient('negative', euiPaletteNegative),
    },
    positive: {
      title: i18n.translate('charts.palettes.positiveLabel', { defaultMessage: 'Positive' }),
      ...buildGradient('positive', euiPalettePositive),
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
      ...buildSyncedKibanaPalette(legacyColorsService),
    },
    custom: buildCustomPalette() as PaletteDefinition<unknown>,
  };
};
