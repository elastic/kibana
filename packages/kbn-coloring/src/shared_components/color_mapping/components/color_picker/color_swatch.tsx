/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiColorPickerSwatch, EuiPopover } from '@elastic/eui';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { ColorPicker } from './color_picker';
import { getAssignmentColor } from '../../color/color_handling';
import { ColorMapping } from '../../config';
import { getPalette } from '../../palettes';
import { removeGradientColorStep } from '../../state/color_mapping';

import { selectColorPickerVisibility } from '../../state/selectors';
import { colorPickerVisibility, hideColorPickerVisibility } from '../../state/ui';
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

  return canPickColor && assignmentColor.type !== 'gradient' ? (
    <EuiPopover
      panelPaddingSize="s"
      isOpen={colorPickerVisible}
      repositionOnScroll={true}
      closePopover={() => dispatch(hideColorPickerVisibility())}
      anchorPosition="upLeft"
      button={
        <EuiColorPickerSwatch
          color={colorHex}
          aria-label={i18n.translate('coloring.colorMapping.colorPicker.pickAColorAriaLabel', {
            defaultMessage: 'Pick a color',
          })}
          data-test-subj={`lns-colorMapping-colorSwatch-${index}`}
          onClick={() => dispatch(colorPickerVisibility({ index, visible: true, type: forType }))}
          style={{
            ...(swatchShape === 'round' ? { borderRadius: '50%', width: 15, height: 15 } : {}),
            // the color swatch doesn't work here...
            backgroundColor: colorHex,
            cursor: canPickColor ? 'pointer' : 'not-allowed',
          }}
          className={
            swatchShape === 'round'
              ? 'colorMappingColorSwatchEditableRound'
              : 'colorMappingColorSwatchEditable'
          }
        />
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
          colorMode.type === 'gradient' && index > 0
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
      style={{
        ...(swatchShape === 'round' ? { borderRadius: '50%', width: 15, height: 15 } : {}),
        // the color swatch doesn't work here...
        backgroundColor: colorHex,
        cursor: canPickColor ? 'pointer' : 'not-allowed',
      }}
      disabled
      className={
        swatchShape === 'round'
          ? 'colorMappingColorSwatchEditableRound'
          : 'colorMappingColorSwatchEditable'
      }
    />
  );
};
