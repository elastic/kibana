/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import { getActivePaletteName } from '@kbn/coloring';
import { EuiColorPalettePicker, EuiColorPalettePickerPaletteProps } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getAppendedTag } from '@kbn/palettes';

const DEFAULT_PALETTE = 'default';

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
  const paletteName = getActivePaletteName(activePalette?.name);

  const palettesList: EuiColorPalettePickerPaletteProps[] = palettes
    .getAll()
    .filter(({ internal }) => !internal)
    .map(({ id, title, tag, getCategoricalColors }) => {
      return {
        value: id,
        title,
        type: 'fixed',
        append: getAppendedTag(tag),
        palette: getCategoricalColors(10, id === paletteName ? activePalette?.params : undefined),
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
            name: palette?.value ?? DEFAULT_PALETTE,
          });
        }}
        valueOfSelected={paletteName}
        selectionDisplay={'palette'}
      />
    </EuiFormRow>
  );
}
