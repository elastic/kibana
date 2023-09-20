/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiButton, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ColorMapping } from '../../config';
import { getPalette } from '../../palettes';
import { PaletteColors } from './palette_colors';
import { RGBPicker } from './rgb_picker';
import { NeutralPalette } from '../../palettes/neutral';

export function ColorPicker({
  palette,
  getPaletteFn,
  color,
  close,
  selectColor,
  isDarkMode,
  deleteStep,
}: {
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
  getPaletteFn: ReturnType<typeof getPalette>;
  palette: ColorMapping.CategoricalPalette;
  isDarkMode: boolean;
  close: () => void;
  selectColor: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
  deleteStep?: () => void;
}) {
  const [tab, setTab] = useState(
    color.type === 'categorical' &&
      (color.paletteId === palette.id || color.paletteId === NeutralPalette.id)
      ? 'palette'
      : 'custom'
  );

  return (
    <div style={{ width: 200 }}>
      <EuiTabs size="s" expand>
        <EuiTab onClick={() => setTab('palette')} isSelected={tab === 'palette'}>
          {i18n.translate('coloring.colorMapping.colorPicker.paletteTabLabel', {
            defaultMessage: 'Palette',
          })}
        </EuiTab>
        <EuiTab onClick={() => setTab('custom')} isSelected={tab === 'custom'}>
          {i18n.translate('coloring.colorMapping.colorPicker.customTabLabel', {
            defaultMessage: 'Custom',
          })}
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="m" />
      {tab === 'palette' ? (
        <PaletteColors
          color={color}
          getPaletteFn={getPaletteFn}
          palette={palette}
          selectColor={selectColor}
          isDarkMode={isDarkMode}
        />
      ) : (
        <RGBPicker
          color={color}
          getPaletteFn={getPaletteFn}
          isDarkMode={isDarkMode}
          selectColor={selectColor}
          palette={palette}
          close={close}
        />
      )}
      {deleteStep ? (
        <>
          <EuiSpacer size="m" />
          <EuiButton
            iconType="trash"
            onClick={() => {
              close();
              deleteStep();
            }}
          >
            {i18n.translate('coloring.colorMapping.colorPicker.removeGradientColorButtonLabel', {
              defaultMessage: 'Remove from gradient',
            })}
          </EuiButton>
        </>
      ) : null}
    </div>
  );
}
