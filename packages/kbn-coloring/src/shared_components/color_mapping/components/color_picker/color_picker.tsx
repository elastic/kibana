/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiPopoverTitle, EuiTab, EuiTabs, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IKbnPalette, KbnPalettes } from '@kbn/palettes';
import { ColorMapping } from '../../config';
import { PaletteColors } from './palette_colors';
import { RGBPicker } from './rgb_picker';
import { NeutralPalette } from '../../palettes/neutral';

export function ColorPicker({
  color,
  palette,
  palettes,
  close,
  selectColor,
  deleteStep,
}: {
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
  palette: IKbnPalette;
  palettes: KbnPalettes;
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
    <div style={{ width: 168 }}>
      <EuiPopoverTitle
        paddingSize="none"
        style={{
          borderBottom: 'none',
        }}
      >
        <EuiTabs size="m" expand>
          <EuiTab onClick={() => setTab('palette')} isSelected={tab === 'palette'}>
            {i18n.translate('coloring.colorMapping.colorPicker.paletteTabLabel', {
              defaultMessage: 'Colors',
            })}
          </EuiTab>
          <EuiTab onClick={() => setTab('custom')} isSelected={tab === 'custom'}>
            {i18n.translate('coloring.colorMapping.colorPicker.customTabLabel', {
              defaultMessage: 'Custom',
            })}
          </EuiTab>
        </EuiTabs>
      </EuiPopoverTitle>
      {tab === 'palette' ? (
        <PaletteColors
          color={color}
          palette={palette}
          palettes={palettes}
          selectColor={selectColor}
        />
      ) : (
        <RGBPicker color={color} selectColor={selectColor} palettes={palettes} />
      )}
      {deleteStep ? (
        <>
          <EuiHorizontalRule margin="xs" />
          <EuiButtonEmpty
            color="danger"
            size="xs"
            iconType="trash"
            onClick={() => {
              close();
              deleteStep();
            }}
            style={{ paddingBottom: 8 }}
          >
            {i18n.translate('coloring.colorMapping.colorPicker.removeGradientColorButtonLabel', {
              defaultMessage: 'Remove color stop',
            })}
          </EuiButtonEmpty>
        </>
      ) : null}
    </div>
  );
}
