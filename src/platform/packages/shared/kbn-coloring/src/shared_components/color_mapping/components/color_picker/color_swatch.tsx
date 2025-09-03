/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiColorPickerSwatch,
  EuiPopover,
  euiShadowSmall,
  isColorDark,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { IKbnPalette, KbnPalettes } from '@kbn/palettes';
import { ColorPicker } from './color_picker';
import { getAssignmentColor } from '../../color/color_handling';
import { ColorMapping } from '../../config';
import { removeGradientColorStep } from '../../state/color_mapping';

import { selectColorPickerVisibility } from '../../state/selectors';
import { colorPickerVisibility, hideColorPickerVisibility } from '../../state/ui';
import { getValidColor } from '../../color/color_math';

interface ColorPickerSwatchProps {
  colorMode: ColorMapping.Config['colorMode'];
  assignmentColor: ColorMapping.Assignment['color'];
  index: number;
  total: number;
  palette: IKbnPalette;
  palettes: KbnPalettes;
  onColorChange: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
  swatchShape: 'square' | 'round';
  isDarkMode: boolean;
  forType: 'assignment' | 'specialAssignment' | 'gradient';
}

export const ColorSwatch = ({
  colorMode,
  assignmentColor,
  index,
  total,
  palette,
  palettes,
  onColorChange,
  swatchShape,
  isDarkMode,
  forType,
}: ColorPickerSwatchProps) => {
  const colorPickerState = useSelector(selectColorPickerVisibility);
  const dispatch = useDispatch();
  const colorPickerVisible =
    colorPickerState.index === index &&
    colorPickerState.type === forType &&
    colorPickerState.visibile;
  const colorHex = getAssignmentColor(
    colorMode,
    assignmentColor,
    palettes,
    isDarkMode,
    index,
    total
  );
  const colorIsDark = isColorDark(...getValidColor(colorHex).rgb());
  const euiTheme = useEuiTheme();
  return assignmentColor.type !== 'gradient' ? (
    <EuiPopover
      panelPaddingSize="none"
      isOpen={colorPickerVisible}
      repositionOnScroll={true}
      closePopover={() => dispatch(hideColorPickerVisibility())}
      anchorPosition="upLeft"
      css={css`
        display: flex;
        justify-content: center;
        align-items: center;
      `}
      button={
        swatchShape === 'round' ? (
          <button
            aria-label={i18n.translate('coloring.colorMapping.colorPicker.pickAColorAriaLabel', {
              defaultMessage: 'Pick a color',
            })}
            data-test-subj={`lns-colorMapping-colorSwatch-${index}`}
            onClick={() =>
              dispatch(
                colorPickerVisible
                  ? hideColorPickerVisibility()
                  : colorPickerVisibility({ index, visible: true, type: forType })
              )
            }
            css={css`
              background: ${colorHex};
              width: 16px;
              height: 16px;
              border-radius: 50%;
              top: 8px;
              border: 3px solid ${euiTheme.euiTheme.colors.emptyShade};
              ${euiShadowSmall(euiTheme)};
              backgroundcolor: ${colorHex};
              cursor: pointer;
            `}
          />
        ) : (
          <EuiColorPickerSwatch
            color={colorHex}
            aria-label={i18n.translate('coloring.colorMapping.colorPicker.pickAColorAriaLabel', {
              defaultMessage: 'Pick a color',
            })}
            data-test-subj={`lns-colorMapping-colorSwatch-${index}`}
            onClick={() =>
              dispatch(
                colorPickerVisible
                  ? hideColorPickerVisibility()
                  : colorPickerVisibility({ index, visible: true, type: forType })
              )
            }
            style={{
              // the color swatch can't pickup colors written in rgb/css standard
              backgroundColor: colorHex,
              cursor: 'pointer',
              width: 32,
              height: 32,
            }}
            css={css`
              &::after {
                content: '';
                background-color: ${colorIsDark ? 'white' : 'black'};
                // custom arrowDown svg
                mask-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3IiBoZWlnaHQ9IjQiIHZpZXdCb3g9IjAgMCA3IDQiPgogIDxwYXRoIGQ9Ik0uMTQ2LjE0N2EuNS41IDAgMCAxIC43MDggMEwzLjUgMi43OTQgNi4xNDYuMTQ3YS41LjUgMCAxIDEgLjcwOC43MDhsLTMgM2EuNS41IDAgMCAxLS43MDggMGwtMy0zYS41LjUgMCAwIDEgMC0uNzA4WiIvPgo8L3N2Zz4K');
                height: 4px;
                width: 7px;
                bottom: 6px;
                right: 4px;
                position: absolute;
              }
            `}
          />
        )
      }
    >
      <ColorPicker
        key={
          assignmentColor.type === 'categorical'
            ? `${assignmentColor.colorIndex}-${assignmentColor.paletteId}`
            : assignmentColor.colorCode
        }
        color={assignmentColor}
        palette={palette}
        palettes={palettes}
        close={() => dispatch(hideColorPickerVisibility())}
        selectColor={(color) => {
          onColorChange(color);
        }}
        deleteStep={
          colorMode.type === 'gradient' && total > 1
            ? () => dispatch(removeGradientColorStep(index))
            : undefined
        }
      />
    </EuiPopover>
  ) : (
    <EuiColorPickerSwatch
      color={colorHex}
      aria-label={i18n.translate('coloring.colorMapping.colorSwatch.gradientAriaLabel', {
        defaultMessage: 'Computed gradient color',
      })}
      title={i18n.translate('coloring.colorMapping.colorSwatch.gradientAriaLabel', {
        defaultMessage: 'Computed gradient color',
      })}
      disabled
      style={{
        // the color swatch can't pickup colors written in rgb/css standard
        backgroundColor: colorHex,
        cursor: 'not-allowed',
        width: 32,
        height: 32,
      }}
    />
  );
};
