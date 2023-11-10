/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { ColorPicker } from './color_picker';
import { getAssignmentColor } from '../../color/color_handling';
import { ColorMapping } from '../../config';
import { getPalette } from '../../palettes';
import { removeGradientColorStep } from '../../state/color_mapping';

import { selectColorPickerVisibility } from '../../state/selectors';
import { colorPickerVisibility, hideColorPickerVisibility } from '../../state/ui';
import { getValidColor } from '../../color/color_math';

interface ColorPickerSwatchProps {
  colorMode: ColorMapping.Config['colorMode'];
  assignmentColor:
    | ColorMapping.Config['assignments'][number]['color']
    | ColorMapping.Config['specialAssignments'][number]['color'];
  getPaletteFn: ReturnType<typeof getPalette>;
  canPickColor: boolean;
  index: number;
  total: number;
  palette: ColorMapping.CategoricalPalette;
  onColorChange: (color: ColorMapping.CategoricalColor | ColorMapping.ColorCode) => void;
  swatchShape: 'square' | 'round';
  isDarkMode: boolean;
  forType: 'assignment' | 'specialAssignment' | 'gradient';
}
export const ColorSwatch = ({
  colorMode,
  assignmentColor,
  getPaletteFn,
  canPickColor,
  index,
  total,
  palette,
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
    getPaletteFn,
    isDarkMode,
    index,
    total
  );
  const colorIsDark = isColorDark(...getValidColor(colorHex).rgb());
  const euiTheme = useEuiTheme();
  return canPickColor && assignmentColor.type !== 'gradient' ? (
    <EuiPopover
      panelPaddingSize="none"
      isOpen={colorPickerVisible}
      repositionOnScroll={true}
      closePopover={() => dispatch(hideColorPickerVisibility())}
      anchorPosition="upLeft"
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
              border: 3px solid white;
              ${euiShadowSmall(euiTheme)};
              backgroundcolor: ${colorHex};
              cursor: ${canPickColor ? 'pointer' : 'not-allowed'};
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
              cursor: canPickColor ? 'pointer' : 'not-allowed',
              width: 32,
              height: 32,
            }}
            css={css`
              &::after {
                content: '';
                width: 0;
                height: 0;
                border-left: 3px solid transparent;
                border-right: 3px solid transparent;
                border-top: 4px solid ${colorIsDark ? 'white' : 'black'};
                margin: 0;
                bottom: 2px;
                position: absolute;
                right: 2px;
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
        getPaletteFn={getPaletteFn}
        close={() => dispatch(hideColorPickerVisibility())}
        isDarkMode={isDarkMode}
        selectColor={(color) => {
          // dispatch update
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
      aria-label={i18n.translate('coloring.colorMapping.colorPicker.newColorAriaLabel', {
        defaultMessage: 'Select a new color',
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
