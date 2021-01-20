/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import { EuiColorPalettePicker } from '@elastic/eui';
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
        palettes={palettes
          .getAll()
          .filter(({ internal }) => !internal)
          .map(({ id, title, getColors }) => {
            return {
              value: id,
              title,
              type: 'fixed',
              palette: getColors(
                10,
                id === activePalette?.name ? activePalette?.params : undefined
              ),
            };
          })}
        onChange={(newPalette) => {
          setPalette(paramName, {
            type: 'palette',
            name: newPalette,
          });
        }}
        valueOfSelected={activePalette?.name || 'default'}
        selectionDisplay={'palette'}
      />
    </EuiFormRow>
  );
}
