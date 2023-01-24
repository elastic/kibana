/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteRegistry, PaletteOutput } from '@kbn/coloring';
import { PALETTES } from '../../../common/enums';
import type { PanelData } from '../../../common/types';
import { computeGradientFinalColor } from './compute_gradient_final_color';
import { rainbowColors } from './rainbow_colors';
import { getValueOrEmpty } from '../../../common/empty_label';

interface PaletteParams {
  colors: string[];
  gradient: boolean;
}

export interface SplitByTermsColorProps {
  seriesById: PanelData[];
  seriesName: string;
  seriesId: string;
  baseColor: string;
  seriesPalette: PaletteOutput<PaletteParams>;
  palettesRegistry: PaletteRegistry;
  syncColors: boolean;
}

export const getSplitByTermsColor = ({
  seriesById,
  seriesName,
  seriesId,
  baseColor,
  seriesPalette,
  palettesRegistry,
  syncColors,
}: SplitByTermsColorProps) => {
  if (!seriesPalette) {
    return null;
  }
  const paletteName =
    seriesPalette.name === PALETTES.RAINBOW || seriesPalette.name === PALETTES.GRADIENT
      ? 'custom'
      : seriesPalette.name;

  const paletteParams =
    seriesPalette.name === PALETTES.GRADIENT
      ? {
          ...seriesPalette.params,
          colors: [baseColor, computeGradientFinalColor(baseColor)],
          gradient: true,
        }
      : seriesPalette.name === PALETTES.RAINBOW
      ? {
          ...seriesPalette.params,
          colors: rainbowColors,
        }
      : seriesPalette.params;

  const outputColor = palettesRegistry?.get(paletteName || 'default').getCategoricalColor(
    [
      {
        name: getValueOrEmpty(seriesName),
        rankAtDepth: seriesById.findIndex(({ id }) => id === seriesId),
        totalSeriesAtDepth: seriesById.length,
      },
    ],
    {
      maxDepth: 1,
      totalSeries: seriesById.length,
      behindText: false,
      syncColors,
    },
    paletteParams
  );
  return outputColor;
};
