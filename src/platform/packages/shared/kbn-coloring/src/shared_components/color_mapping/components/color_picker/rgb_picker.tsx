/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiColorPicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import chromajs from 'chroma-js';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
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
          isDarkMode,
          false
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

  const isColorTextInvalid = !chromajs.valid(colorTextInput);
  const colorHasLowContrast = !lightContrast || !darkContrast;

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
  const invalidColor = isColorTextInvalid
    ? euiThemeVars.euiColorDanger
    : colorHasLowContrast
    ? euiThemeVars.euiColorWarning
    : '';
  const invalidColorText = isColorTextInvalid
    ? euiThemeVars.euiColorDangerText
    : colorHasLowContrast
    ? euiThemeVars.euiColorWarningText
    : '';
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
            isColorTextInvalid || colorHasLowContrast
              ? css`
                  input {
                    background-image: linear-gradient(
                      to top,
                      ${invalidColor},
                      ${invalidColor} 2px,
                      transparent 2px,
                      transparent 100%
                    ) !important;
                    background-size: 100%;
                    padding-right: 32px;
                  }
                  .euiFormErrorText {
                    color: ${invalidColorText} !important;
                  }
                `
              : undefined
          }
        >
          <EuiFormRow>
            <EuiFlexGroup
              css={css`
                position: relative;
              `}
            >
              <EuiFlexItem>
                <EuiFieldText
                  placeholder="#FF00FF"
                  value={colorTextInput}
                  compressed
                  onChange={(e) => {
                    const textColor = e.currentTarget.value;
                    setColorTextInput(textColor);
                    if (chromajs.valid(textColor)) {
                      setCustomColorMappingColor({
                        type: 'colorCode',
                        colorCode: textColor,
                      });
                    }
                  }}
                  aria-label={i18n.translate(
                    'coloring.colorMapping.colorPicker.hexColorinputAriaLabel',
                    {
                      defaultMessage: 'hex color input',
                    }
                  )}
                />
              </EuiFlexItem>
              {(isColorTextInvalid || colorHasLowContrast) && (
                <div
                  css={css`
                    position: absolute;
                    right: 8px;
                    top: 6px;
                  `}
                >
                  <EuiToolTip
                    position="bottom"
                    content={
                      isColorTextInvalid
                        ? i18n.translate('coloring.colorMapping.colorPicker.invalidColorHex', {
                            defaultMessage: 'Please use a valid color hex code',
                          })
                        : colorHasLowContrast
                        ? i18n.translate('coloring.colorMapping.colorPicker.lowContrastColor', {
                            defaultMessage: `This color has a low contrast in {themes} {errorModes, plural, one {mode} other {# modes}}`,
                            values: {
                              themes: errorMessage.join(','),
                              errorModes: errorMessage.length,
                            },
                          })
                        : undefined
                    }
                  >
                    <EuiIcon
                      tabIndex={0}
                      type="warning"
                      color={
                        isColorTextInvalid
                          ? euiThemeVars.euiColorDangerText
                          : colorHasLowContrast
                          ? euiThemeVars.euiColorWarningText
                          : euiThemeVars.euiColorPrimary
                      }
                    />
                  </EuiToolTip>
                </div>
              )}
            </EuiFlexGroup>
          </EuiFormRow>
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
