/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiColorPicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import { ColorMapping } from '../../config';

import { getColorContrast } from '../../color/color_math';
import { getPalette } from '../../palette';

export function HSLPicker({
  isDarkMode,
  color,
  getPaletteFn,
  selectColor,
  close,
}: {
  palette: ColorMapping.CategoricalPalette;
  isDarkMode: boolean;
  color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
  getPaletteFn: ReturnType<typeof getPalette>;
  selectColor: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
  close: () => void;
}) {
  const [customColor, setCustomColor] = useState<
    ColorMapping.CategoricalColor | ColorMapping.ColorCode
  >(color);

  const customColorHex =
    customColor.type === 'categorical'
      ? getPaletteFn(customColor.paletteId).getColor(customColor.colorIndex, isDarkMode)
      : customColor.colorCode;
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiText size="s">
          <strong>Contrast:</strong>{' '}
          {getColorContrast(customColorHex, isDarkMode).contrast ? (
            <EuiIcon type="checkInCircleFilled" color="success" />
          ) : (
            <EuiIcon type="error" color="danger" />
          )}
          <br />
          <strong>APCA:</strong>
          {getColorContrast(customColorHex, isDarkMode).value}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiColorPicker
          onChange={(c) => {
            setCustomColor({
              type: 'colorCode',
              colorCode: c,
            });
          }}
          color={customColorHex}
          display="inline"
          swatches={[]}
          showAlpha
        />
      </EuiFlexItem>

      <EuiFlexItem grow={0}>
        <EuiButton
          size="s"
          onClick={() => {
            if (color !== customColor) {
              selectColor(customColor);
            } else {
              close();
            }
          }}
        >
          Apply this color
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        <EuiButton
          size="s"
          onClick={() => {
            close();
          }}
        >
          Close
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
