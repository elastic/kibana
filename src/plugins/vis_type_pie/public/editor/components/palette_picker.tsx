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
      label={i18n.translate('visTypePie.palettePicker.label', {
        defaultMessage: 'Color palette',
      })}
    >
      <EuiColorPalettePicker
        data-test-subj="piePalettePicker"
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
