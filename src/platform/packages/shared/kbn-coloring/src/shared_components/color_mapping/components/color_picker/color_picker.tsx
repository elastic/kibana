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
import { IKbnPalette, KbnPalette, KbnPalettes } from '@kbn/palettes';
import { ColorMapping } from '../../config';
import { PaletteColors } from './palette_colors';
import { RGBPicker } from './rgb_picker';

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
      (color.paletteId === palette.id || color.paletteId === KbnPalette.Neutral)
      ? 'palette'
      : 'custom'
  );

  return (
    <div css={{ width: 168, position: 'relative' }}>
      <EuiPopoverTitle
        paddingSize="none"
        css={{
          borderBottom: 'none',
        }}
      >
        <EuiTabs size="m" expand>
          <EuiTab
            data-test-subj="lns-colorMapping-colorPicker-tab-colors"
            onClick={() => setTab('palette')}
            isSelected={tab === 'palette'}
          >
            {i18n.translate('coloring.colorMapping.colorPicker.paletteTabLabel', {
              defaultMessage: 'Colors',
            })}
          </EuiTab>
          <EuiTab
            data-test-subj="lns-colorMapping-colorPicker-tab-custom"
            onClick={() => setTab('custom')}
            isSelected={tab === 'custom'}
          >
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
            css={({ euiTheme }) => ({
              paddingBottom: euiTheme.size.s,
            })}
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
