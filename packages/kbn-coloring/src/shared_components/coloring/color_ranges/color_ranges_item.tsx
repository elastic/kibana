/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import React, { useState, useCallback, Dispatch, FocusEvent, useContext } from 'react';

import {
  EuiFieldNumber,
  EuiColorPicker,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiColorPickerSwatch,
  EuiButtonIcon,
  EuiFieldNumberProps,
} from '@elastic/eui';

import {
  PaletteContinuity,
  checkIsMaxContinuity,
  checkIsMinContinuity,
  CustomPaletteParams,
} from '../../../palettes';

import { RelatedIcon } from '../assets/related';
import { isLastItem } from './utils';
import { isValidColor } from '../utils';
import {
  ColorRangeDeleteButton,
  ColorRangeAutoDetectButton,
  ColorRangeEditButton,
} from './color_ranges_item_buttons';

import type { ColorRange, ColorRangeAccessor, ColorRangesActions } from './types';
import { ColorRangesContext } from './color_ranges_context';
import type { ColorRangeValidation } from './color_ranges_validation';

export interface ColorRangesItemProps {
  colorRange: ColorRange;
  index: number;
  colorRanges: ColorRange[];
  dispatch: Dispatch<ColorRangesActions>;
  rangeType: CustomPaletteParams['rangeType'];
  continuity: PaletteContinuity;
  accessor: ColorRangeAccessor;
  validation?: ColorRangeValidation;
}

type ColorRangeItemMode = 'value' | 'auto' | 'edit';

const getMode = (
  index: ColorRangesItemProps['index'],
  isLast: boolean,
  continuity: PaletteContinuity
): ColorRangeItemMode => {
  if (!isLast && index > 0) {
    return 'value';
  }
  return (isLast ? checkIsMaxContinuity : checkIsMinContinuity)(continuity) ? 'auto' : 'edit';
};

const getPlaceholderForAutoMode = (isLast: boolean) =>
  isLast
    ? i18n.translate('coloring.dynamicColoring.customPalette.maxValuePlaceholder', {
        defaultMessage: 'Max. value',
      })
    : i18n.translate('coloring.dynamicColoring.customPalette.minValuePlaceholder', {
        defaultMessage: 'Min. value',
      });

const getActionButton = (mode: ColorRangeItemMode) => {
  if (mode === 'value') {
    return ColorRangeDeleteButton;
  }
  return mode === 'edit' ? ColorRangeAutoDetectButton : ColorRangeEditButton;
};

const getAppend = (rangeType: CustomPaletteParams['rangeType'], mode: ColorRangeItemMode) => {
  const items: EuiFieldNumberProps['append'] = [];

  if (rangeType === 'percent' && mode !== 'auto') {
    items.push('%');
  }

  return items;
};

export function ColorRangeItem({
  accessor,
  index,
  colorRange,
  rangeType,
  colorRanges,
  validation,
  continuity,
  dispatch,
}: ColorRangesItemProps) {
  const { dataBounds, palettes } = useContext(ColorRangesContext);
  const [popoverInFocus, setPopoverInFocus] = useState<boolean>(false);
  const [localValue, setLocalValue] = useState<number | undefined>(colorRange[accessor]);
  const isLast = isLastItem(accessor);
  const mode = getMode(index, isLast, continuity);
  const isDisabled = mode === 'auto';
  const isColorValid = isValidColor(colorRange.color);
  const ActionButton = getActionButton(mode);
  const isValid = validation?.isValid ?? true;

  const onLeaveFocus = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      const prevStartValue = colorRanges[index - 1]?.start ?? Number.NEGATIVE_INFINITY;
      const nextStartValue = colorRanges[index + 1]?.start ?? Number.POSITIVE_INFINITY;
      const lastEndValue = colorRanges[colorRanges.length - 1]?.end ?? Number.POSITIVE_INFINITY;

      const shouldSort =
        colorRange.start > nextStartValue ||
        prevStartValue > colorRange.start ||
        (!isLast && colorRange.start > lastEndValue);
      const isFocusStillInContent =
        (e.currentTarget as Node)?.contains(e.relatedTarget as Node) || popoverInFocus;

      if (shouldSort && !isFocusStillInContent) {
        dispatch({ type: 'sortColorRanges', payload: { dataBounds, palettes } });
      }
    },
    [colorRange.start, colorRanges, dispatch, index, popoverInFocus, dataBounds, palettes, isLast]
  );

  const onValueChange = useCallback(
    ({ target: { value: targetValue } }) => {
      setLocalValue(targetValue);
      dispatch({
        type: 'updateValue',
        payload: { index, value: targetValue, accessor, dataBounds, palettes },
      });
    },
    [dispatch, index, accessor, dataBounds, palettes]
  );

  const onUpdateColor = useCallback(
    (color) => {
      dispatch({ type: 'updateColor', payload: { index, color, dataBounds, palettes } });
    },
    [dispatch, index, dataBounds, palettes]
  );

  useUpdateEffect(() => {
    if (!Number.isNaN(colorRange[accessor]) && colorRange[accessor] !== localValue) {
      setLocalValue(colorRange[accessor]);
    }
  }, [localValue, colorRange, accessor]);

  const selectNewColorText = i18n.translate(
    'coloring.dynamicColoring.customPalette.selectNewColor',
    {
      defaultMessage: 'Select a new color',
    }
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false} responsive={false}>
      <EuiFlexItem grow={false}>
        {!isLast ? (
          <EuiColorPicker
            onChange={onUpdateColor}
            button={
              isColorValid ? (
                <EuiColorPickerSwatch color={colorRange.color} aria-label={selectNewColorText} />
              ) : (
                <EuiButtonIcon
                  color="danger"
                  iconType="stopSlash"
                  iconSize="l"
                  aria-label={selectNewColorText}
                />
              )
            }
            secondaryInputDisplay="top"
            color={colorRange.color}
            showAlpha={true}
            onFocus={() => setPopoverInFocus(true)}
            onBlur={() => {
              setPopoverInFocus(false);
            }}
            isInvalid={!isColorValid}
          />
        ) : (
          <EuiIcon type={RelatedIcon} size="l" />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiFieldNumber
          compressed
          fullWidth={true}
          isInvalid={!isValid}
          value={
            mode !== 'auto' && localValue !== undefined && isFinite(localValue) ? localValue : ''
          }
          disabled={isDisabled}
          onChange={onValueChange}
          placeholder={mode === 'auto' ? getPlaceholderForAutoMode(isLast) : ''}
          append={getAppend(rangeType, mode)}
          onBlur={onLeaveFocus}
          data-test-subj={`lnsPalettePanel_dynamicColoring_range_value_${index}`}
          prepend={<span className="euiFormLabel">{isLast ? '\u2264' : '\u2265'}</span>}
          aria-label={i18n.translate('coloring.dynamicColoring.customPalette.rangeAriaLabel', {
            defaultMessage: 'Range {index}',
            values: {
              index: index + 1,
            },
          })}
          step="any"
        />
      </EuiFlexItem>
      {ActionButton ? (
        <EuiFlexItem grow={false}>
          <ActionButton
            index={index}
            continuity={continuity}
            rangeType={rangeType}
            colorRanges={colorRanges}
            dispatch={dispatch}
            accessor={accessor}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
