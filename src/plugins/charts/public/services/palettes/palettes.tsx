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
import { PaletteDefinition, SeriesLayer } from './types';
import { LegacyColorsService } from '../legacyColors';

function buildRoundRobinCategoricalWithMappedColors(
  colorService: LegacyColorsService,
  id: string,
  colors: (n: number) => string[],
  behindTextColors?: (n: number) => string[]
) {
  const colorCache: Partial<Record<string, string>> = {};
  function getColor(series: SeriesLayer[]) {
    const colorFromSettings = colorService.mappedColors.getColorFromConfig(series[0].name);
    const actualColors = colors(series[0].totalSeriesAtDepth);
    const actualBehindTextColors =
      behindTextColors && behindTextColors(series[0].totalSeriesAtDepth);
    let outputColor =
      colorFromSettings ||
      colorCache[series[0].name] ||
      actualColors[series[0].rankAtDepth % actualColors.length];

    colorCache[series[0].name] = outputColor;

    // translate the color to the behind text variant if possible
    if (series[0].behindText && actualBehindTextColors) {
      const colorIndex = actualColors.findIndex((color) => outputColor);
      if (colorIndex !== -1) {
        outputColor = actualBehindTextColors[colorIndex];
      }
    }

    if (series[0].maxDepth === 1) {
      return outputColor;
    }

    return lightenColor(outputColor, series.length, series[0].maxDepth);
  }
  return {
    id,
    getColor,
    getColors: colors,
    getPreview: () => ({ colors: colors(10) }),
  };
}

function buildSyncedKibanaPalette(colors: ChartsPluginSetup['legacyColors']) {
  function getColor(series: SeriesLayer[]) {
    colors.mappedColors.mapKeys([series[0].name]);
    const outputColor = colors.mappedColors.get(series[0].name);

    return lightenColor(outputColor, series.length, series[0].maxDepth);
  }
  return {
    id: 'kibana_palette',
    getColor,
    getColors: () => colors.seedColors.slice(0, 10),
    getPreview: () => ({ colors: colors.seedColors.slice(0, 10) }),
  };
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
  };
};
