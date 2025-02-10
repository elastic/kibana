/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  PaletteContinuity,
  checkIsMaxContinuity,
  checkIsMinContinuity,
  DataBounds,
  roundValue,
  getDataMinMax,
  CustomPaletteParams,
} from '../../../../palettes';
import { InfinityIcon } from '../../assets/infinity';
import { ValueMaxIcon } from '../../assets/value_max';
import { ValueMinIcon } from '../../assets/value_min';

import type { ColorRange, ColorRangeAccessor } from '../types';

/**
 * Check if item is last
 * @internal
 */
export const isLastItem = (accessor: ColorRangeAccessor) => accessor === 'end';

/**
 * Sort Color ranges array
 * @internal
 */
export const sortColorRanges = (colorRanges: ColorRange[]) => {
  const lastRange = colorRanges[colorRanges.length - 1];

  // we should add last end as new start because we should include it on sorting
  return [...colorRanges, { start: lastRange.end, color: lastRange.color, end: undefined }]
    .sort(({ start: startA }, { start: startB }) => Number(startA) - Number(startB))
    .reduce((sortedColorRange, newColorRange, i, array) => {
      // we should pick correct color for the last range.
      // If after sorting we don't change last value we should just take color in array order
      // In another case we should get the next one.
      let color = newColorRange.color;
      if (i === array.length - 2 && array[i + 1].start !== lastRange.end) {
        color = array[i + 1].color;
      }
      if (i !== array.length - 1) {
        sortedColorRange.push({
          color,
          start: newColorRange.start,
          end: array[i + 1].start,
        });
      }
      return sortedColorRange;
    }, [] as ColorRange[]);
};

/**
 * Calculate max step
 * @internal
 */
export const calculateMaxStep = (stops: number[], max: number) => {
  let step = 1;
  if (stops.length > 1) {
    const last = stops[stops.length - 1];
    const last2step = stops[stops.length - 1] - stops[stops.length - 2];

    if (last + last2step < max) {
      step = last2step;
    }
  }
  return roundValue(step);
};

/**
 * Convert ColorRange to ColorStops
 * @internal
 */

export const toColorStops = (colorRanges: ColorRange[], continuity: PaletteContinuity) => {
  const min = checkIsMinContinuity(continuity) ? Number.NEGATIVE_INFINITY : colorRanges[0].start;
  const max = checkIsMaxContinuity(continuity)
    ? Number.POSITIVE_INFINITY
    : colorRanges[colorRanges.length - 1].end;

  return {
    min,
    max,
    colorStops: colorRanges.map((colorRange, i) => ({
      color: colorRange.color,
      stop: i === 0 ? min : colorRange.start,
    })),
  };
};

/**
 * Calculate right max or min value for new continuity
 */

export const getValueForContinuity = (
  colorRanges: ColorRange[],
  continuity: PaletteContinuity,
  isUpper: boolean,
  rangeType: CustomPaletteParams['rangeType'],
  dataBounds: DataBounds
) => {
  const { max, min } = getDataMinMax(rangeType, dataBounds);
  let value;
  if (isUpper) {
    if (checkIsMaxContinuity(continuity)) {
      value = Number.POSITIVE_INFINITY;
    } else {
      value = roundValue(
        colorRanges[colorRanges.length - 1].start > max
          ? colorRanges[colorRanges.length - 1].start + 1
          : max
      );
    }
  } else {
    if (checkIsMinContinuity(continuity)) {
      value = Number.NEGATIVE_INFINITY;
    } else {
      value = roundValue(colorRanges[0].end < min ? colorRanges[0].end - 1 : min);
    }
  }

  return value;
};

/**
 * Returns information about an automatic bound (the top and bottom boundaries of the palette range)
 */
export const getAutoBoundInformation = ({
  isPercentage,
  isUpper,
  isAuto,
}: {
  isPercentage: boolean;
  isUpper: boolean;
  isAuto: boolean;
}) => {
  const representation = isUpper
    ? isPercentage
      ? i18n.translate('coloring.dynamicColoring.customPalette.maxValuePlaceholderPercentage', {
          defaultMessage: '100',
        })
      : i18n.translate('coloring.dynamicColoring.customPalette.maxValuePlaceholder', {
          defaultMessage: 'No max.',
        })
    : isPercentage
    ? i18n.translate('coloring.dynamicColoring.customPalette.minValuePlaceholderPercentage', {
        defaultMessage: '0',
      })
    : i18n.translate('coloring.dynamicColoring.customPalette.minValuePlaceholder', {
        defaultMessage: 'No min.',
      });

  const actionDescription = isUpper
    ? isPercentage
      ? i18n.translate('coloring.dynamicColoring.customPalette.useAutoMaxValuePercentage', {
          defaultMessage: `Use maximum percentage`,
        })
      : i18n.translate('coloring.dynamicColoring.customPalette.useAutoMaxValue', {
          defaultMessage: `No maximum value`,
        })
    : isPercentage
    ? i18n.translate('coloring.dynamicColoring.customPalette.useAutoMinValuePercentage', {
        defaultMessage: `Use minimum percentage`,
      })
    : i18n.translate('coloring.dynamicColoring.customPalette.useAutoMinValue', {
        defaultMessage: `No minimum value`,
      });

  const icon = !isPercentage ? InfinityIcon : isUpper ? ValueMaxIcon : ValueMinIcon;

  return { representation, actionDescription, icon };
};
