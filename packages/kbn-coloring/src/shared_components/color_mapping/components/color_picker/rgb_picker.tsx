/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiColorPicker, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import chromajs from 'chroma-js';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { ColorMapping } from '../../config';

import { hasEnoughContrast } from '../../color/color_math';
import { getPalette } from '../../palettes';

export function RGBPicker({
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
  const [customColorMappingColor, setCustomColorMappingColor] = useState<
    ColorMapping.CategoricalColor | ColorMapping.ColorCode
  >(color);

  const customColorHex =
    customColorMappingColor.type === 'categorical'
      ? getPaletteFn(customColorMappingColor.paletteId).getColor(
          customColorMappingColor.colorIndex,
          isDarkMode
        )
      : customColorMappingColor.colorCode;

  const [colorTextInput, setColorTextInput] = useState<string>(customColorHex);

  // check contrasts with WCAG 2.1 with a min contrast ratio of 3
  const lightContrast = hasEnoughContrast(customColorHex, false, 3);
  const darkContrast = hasEnoughContrast(customColorHex, true, 3);

  const errorMessage = [
    lightContrast === false ? 'light' : undefined,
    darkContrast === false ? 'dark' : undefined,
  ].filter(Boolean);

  const isColorTextValid = chromajs.valid(colorTextInput);
  const colorHasContrast = lightContrast && darkContrast;

  // debounce setting the color from the rgb picker by 500ms
  useDebounce(
    () => {
      if (color !== customColorMappingColor) {
        selectColor(customColorMappingColor);
      }
    },
    500,
    [color, customColorMappingColor]
  );
  return (
    <EuiFlexGroup direction="column" gutterSize="s" style={{ padding: 8 }}>
      <EuiFlexItem>
        <EuiColorPicker
          onChange={(c) => {
            setCustomColorMappingColor({
              type: 'colorCode',
              colorCode: c,
            });
            setColorTextInput(c);
          }}
          color={customColorHex}
          display="inline"
          swatches={[]}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <div
          css={
            !colorHasContrast && isColorTextValid
              ? css`
                  svg {
                    fill: ${euiThemeVars.euiColorWarningText} !important;
                  }
                  input {
                    background-image: linear-gradient(
                      to top,
                      ${euiThemeVars.euiColorWarning},
                      ${euiThemeVars.euiColorWarning} 2px,
                      transparent 2px,
                      transparent 100%
                    ) !important;
                  }
                  .euiFormErrorText {
                    color: ${euiThemeVars.euiColorWarningText} !important;
                  }
                `
              : undefined
          }
        >
          <EuiFormRow
            isInvalid={!isColorTextValid || !colorHasContrast}
            error={
              !isColorTextValid
                ? `Please input a valid color hex code`
                : !colorHasContrast
                ? `This color has a low contrast in ${errorMessage} mode${
                    errorMessage.length > 1 ? 's' : ''
                  }`
                : undefined
            }
          >
            <EuiFieldText
              placeholder="Please enter an hex color code"
              value={colorTextInput}
              compressed
              isInvalid={!isColorTextValid || !colorHasContrast}
              onChange={(e) => {
                const textColor = e.currentTarget.value;
                setColorTextInput(textColor);
                if (chromajs.valid(textColor)) {
                  setCustomColorMappingColor({
                    type: 'colorCode',
                    colorCode: chromajs(textColor).hex(),
                  });
                }
              }}
              aria-label="hex color input"
            />
          </EuiFormRow>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
