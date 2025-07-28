/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiColorPickerSwatch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiTitle,
  EuiToolTip,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IKbnPalette, KbnPalette, KbnPalettes } from '@kbn/palettes';
import { ColorMapping } from '../../config';
import { isSameColor } from '../../color/color_math';

export function PaletteColors({
  palette,
  palettes,
  color,
  selectColor,
}: {
  palette: IKbnPalette;
  palettes: KbnPalettes;
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
  selectColor: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const colors = Array.from({ length: palette.colorCount }, (d, i) => {
    return palette.getColor(i);
  });
  const neutralPalette = palettes.get(KbnPalette.Neutral);
  const neutralColors = Array.from({ length: neutralPalette.colorCount }, (d, i) => {
    return neutralPalette.getColor(i);
  });
  const originalColor =
    color.type === 'categorical'
      ? color.paletteId === neutralPalette.id
        ? neutralPalette.getColor(color.colorIndex)
        : palettes.get(color.paletteId).getColor(color.colorIndex)
      : color.colorCode;
  const selectedColorSwatchStyle = {
    outline: `currentcolor solid ${euiTheme.border.width.thick}`,
    outlineOffset: `-${euiTheme.border.width.thin}`,
    border: `${euiTheme.border.width.thick} solid ${euiTheme.colors.borderBaseFormsColorSwatch}`,
  };
  return (
    <>
      <EuiFlexGroup direction="column" style={{ padding: 8 }}>
        <EuiFlexItem>
          <EuiTitle size="xxxs">
            <h6>
              {i18n.translate('coloring.colorMapping.colorPicker.paletteColorsLabel', {
                defaultMessage: 'Palette colors',
              })}
            </h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            wrap={true}
            alignItems="center"
            justifyContent="flexStart"
          >
            {colors.map((c, index) => (
              <EuiFlexItem key={c} grow={0}>
                <EuiColorPickerSwatch
                  data-test-subj={`lns-colorMapping-colorPicker-staticColor-${index}`}
                  css={isSameColor(c, originalColor) ? selectedColorSwatchStyle : undefined}
                  color={c}
                  onClick={() =>
                    selectColor({ type: 'categorical', paletteId: palette.id, colorIndex: index })
                  }
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup style={{ padding: 8, paddingTop: 0 }}>
        <EuiFlexItem>
          <EuiTitle size="xxxs">
            <h6>
              {i18n.translate('coloring.colorMapping.colorPicker.themeAwareColorsLabel', {
                defaultMessage: 'Neutral colors',
              })}
              <EuiToolTip
                position="bottom"
                content={i18n.translate(
                  'coloring.colorMapping.colorPicker.themeAwareColorsTooltip',
                  {
                    defaultMessage:
                      'The provided neutral colors are theme-aware and will change appropriately when switching between light and dark themes.',
                  }
                )}
              >
                <EuiIcon tabIndex={0} type="question" />
              </EuiToolTip>
            </h6>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            direction="row"
            gutterSize="s"
            wrap={true}
            alignItems="center"
            justifyContent="flexStart"
          >
            {neutralColors.map((c, index) => (
              <EuiFlexItem key={c} grow={0}>
                <EuiColorPickerSwatch
                  css={isSameColor(c, originalColor) ? selectedColorSwatchStyle : undefined}
                  data-test-subj={`lns-colorMapping-colorPicker-neutralColor-${index}`}
                  color={c}
                  onClick={() =>
                    selectColor({
                      type: 'categorical',
                      paletteId: neutralPalette.id,
                      colorIndex: index,
                    })
                  }
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
