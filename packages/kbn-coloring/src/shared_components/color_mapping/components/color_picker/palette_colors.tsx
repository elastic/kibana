/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiColorPickerSwatch, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ColorMapping } from '../../config';
import { NeutralPalette } from '../../palettes/default_palettes';
import { isSameColor } from '../../color/color_math';
import { getPalette } from '../../palette';

export function PaletteColors({
  palette,
  isDarkMode,
  color,
  getPaletteFn,
  selectColor,
}: {
  palette: ColorMapping.CategoricalPalette;
  isDarkMode: boolean;
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
  getPaletteFn: ReturnType<typeof getPalette>;
  selectColor: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
}) {
  const colors = Array.from({ length: palette.colorCount }, (d, i) => {
    return palette.getColor(i, isDarkMode);
  });
  const neutralColors = Array.from({ length: NeutralPalette.colorCount }, (d, i) => {
    return NeutralPalette.getColor(i, isDarkMode);
  });
  const originalColor =
    color.type === 'categorical'
      ? color.paletteId === NeutralPalette.id
        ? NeutralPalette.getColor(color.colorIndex, isDarkMode)
        : getPaletteFn(color.paletteId).getColor(color.colorIndex, isDarkMode)
      : color.colorCode;
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiText size="s">
          <strong>Palette</strong>
        </EuiText>
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
                style={{
                  border: isSameColor(c, originalColor) ? '2px solid black' : 'transparent',
                }}
                color={c}
                onClick={() =>
                  selectColor({ type: 'categorical', paletteId: palette.id, colorIndex: index })
                }
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText size="s">
          <strong>Neutral</strong>
        </EuiText>
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
                style={{
                  border: isSameColor(c, originalColor) ? '2px solid black' : 'transparent',
                }}
                color={c}
                onClick={() =>
                  selectColor({
                    type: 'categorical',
                    paletteId: NeutralPalette.id,
                    colorIndex: index,
                  })
                }
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
