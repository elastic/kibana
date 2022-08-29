/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { isValidColor } from '../utils';

import type { ColorRange, ColorRangeAccessor } from './types';

/** @internal **/
type ColorRangeValidationErrors =
  | 'invalidColor'
  | 'invalidValue'
  | 'greaterThanMaxValue'
  | 'percentOutOfBounds';

/** @internal **/
export interface ColorRangeValidation {
  errors: ColorRangeValidationErrors[];
  isValid: boolean;
}

/** @internal **/
export const getErrorMessages = (colorRangesValidity: Record<string, ColorRangeValidation>) => {
  return Array.from(
    new Set(
      Object.values(colorRangesValidity)
        .map((item) => item.errors)
        .flat()
        .map((item) => {
          switch (item) {
            case 'invalidColor':
            case 'invalidValue':
              return i18n.translate('coloring.dynamicColoring.customPalette.invalidValueOrColor', {
                defaultMessage: 'At least one color range contains the wrong value or color',
              });
            case 'greaterThanMaxValue':
              return i18n.translate('coloring.dynamicColoring.customPalette.invalidMaxValue', {
                defaultMessage: 'Maximum value must be greater than preceding values',
              });
            case 'percentOutOfBounds':
              return i18n.translate('coloring.dynamicColoring.customPalette.invalidPercentValue', {
                defaultMessage: 'Percent values must be between 0 and 100',
              });
            default:
              return '';
          }
        })
    )
  );
};

/** @internal **/
export const validateColorRange = (
  colorRange: ColorRange,
  accessor: ColorRangeAccessor,
  isPercent: boolean
) => {
  const errors: ColorRangeValidationErrors[] = [];

  if (Number.isNaN(colorRange[accessor])) {
    errors.push('invalidValue');
  }

  if (accessor === 'end') {
    if (colorRange.start > colorRange.end) {
      errors.push('greaterThanMaxValue');
    }
  } else if (!isValidColor(colorRange.color)) {
    errors.push('invalidColor');
  }

  if (isPercent) {
    const isInvalidPercent = (percent: number) =>
      ![-Infinity, Infinity].includes(percent) && (0 > percent || percent > 100);
    const valuesToCheck =
      accessor !== 'end' ? [colorRange[accessor]] : [colorRange.start, colorRange.end];
    if (valuesToCheck.map(isInvalidPercent).some((invalid) => invalid)) {
      errors.push('percentOutOfBounds');
    }
  }

  return {
    isValid: !errors.length,
    errors,
  } as ColorRangeValidation;
};

export const validateColorRanges = (
  colorRanges: ColorRange[],
  isPercent: boolean
): Record<string, ColorRangeValidation> => {
  const validations = colorRanges.reduce<Record<string, ColorRangeValidation>>(
    (acc, item, index) => ({
      ...acc,
      [index]: validateColorRange(item, 'start', isPercent),
    }),
    {}
  );

  return {
    ...validations,
    last: validateColorRange(colorRanges[colorRanges.length - 1], 'end', isPercent),
  };
};

export const allRangesValid = (colorRanges: ColorRange[], isPercent: boolean) => {
  return Object.values(validateColorRanges(colorRanges, isPercent)).every(
    (colorRange) => colorRange.isValid
  );
};
