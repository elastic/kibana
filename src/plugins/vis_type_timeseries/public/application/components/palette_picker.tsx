/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { EuiColorPalettePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { rainbowColors } from '../lib/rainbow_colors';
import { computeGradientFinalColor } from '../lib/compute_gradient_final_color';
import { PALETTES } from '../../../common/enums';

export interface PalettePickerProps {
  activePalette?: PaletteOutput;
  palettes: PaletteRegistry;
  setPalette: (value: PaletteOutput) => void;
  color: string;
}

export function PalettePicker({ activePalette, palettes, setPalette, color }: PalettePickerProps) {
  const finalGradientColor = computeGradientFinalColor(color);

  return (
    <EuiColorPalettePicker
      fullWidth
      data-test-subj="visEditorPalettePicker"
      compressed
      palettes={[
        ...palettes
          .getAll()
          .filter(({ internal }) => !internal)
          .map(({ id, title, getColors }) => {
            return {
              value: id,
              title,
              type: 'fixed' as const,
              palette: getColors(10),
            };
          }),
        {
          value: PALETTES.GRADIENT,
          title: i18n.translate('visTypeTimeseries.timeSeries.gradientLabel', {
            defaultMessage: 'Gradient',
          }),
          type: 'fixed',
          palette: palettes
            .get('custom')
            .getColors(10, { colors: [color, finalGradientColor], gradient: true }),
        },
        {
          value: PALETTES.RAINBOW,
          title: i18n.translate('visTypeTimeseries.timeSeries.rainbowLabel', {
            defaultMessage: 'Rainbow',
          }),
          type: 'fixed',
          palette: palettes
            .get('custom')
            .getColors(10, { colors: rainbowColors.slice(0, 10), gradient: false }),
        },
      ]}
      onChange={(newPalette) => {
        if (newPalette === PALETTES.RAINBOW) {
          setPalette({
            type: 'palette',
            name: PALETTES.RAINBOW,
            params: {
              colors: rainbowColors,
              gradient: false,
            },
          });
        } else if (newPalette === PALETTES.GRADIENT) {
          setPalette({
            type: 'palette',
            name: PALETTES.GRADIENT,
            params: {
              colors: [color, finalGradientColor],
              gradient: true,
            },
          });
        } else {
          setPalette({
            type: 'palette',
            name: newPalette,
          });
        }
      }}
      valueOfSelected={activePalette?.name || 'default'}
      selectionDisplay={'palette'}
    />
  );
}
