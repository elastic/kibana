/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { EuiColorPalettePicker, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface PalettePickerProps<ParamName extends string> {
  activePalette?: PaletteOutput;
  palettes: PaletteRegistry;
  paramName: ParamName;
  setPalette: (paramName: ParamName, value: PaletteOutput) => void;
}

export function PalettePicker<ParamName extends string>({
  activePalette,
  palettes,
  paramName,
  setPalette,
}: PalettePickerProps<ParamName>) {
  const palettesList: EuiColorPalettePickerPaletteProps[] = palettes
    .getAll()
    .filter(({ internal }) => !internal)
    .map(({ id, title, getCategoricalColors }) => {
      return {
        value: id,
        title,
        type: 'fixed',
        palette: getCategoricalColors(
          10,
          id === activePalette?.name ? activePalette?.params : undefined
        ),
      };
    });

  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('visDefaultEditor.palettePicker.label', {
        defaultMessage: 'Color palette',
      })}
    >
      <EuiColorPalettePicker
        fullWidth
        data-test-subj="visEditorPalettePicker"
        compressed
        palettes={palettesList}
        onChange={(newPalette) => {
          const palette = palettesList.find((item) => item.value === newPalette);
          setPalette(paramName, {
            type: 'palette',
            name: palette?.value ?? 'clear',
            params: {
              colors: palette?.palette,
            },
          });
        }}
        valueOfSelected={activePalette?.name || 'default'}
        selectionDisplay={'palette'}
      />
    </EuiFormRow>
  );
}
