/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Position } from '@elastic/charts';
import { euiLightVars } from '@kbn/ui-theme';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { IconPosition, YAxisMode } from '../../../common/types';
import {
  LINES_MARKER_SIZE,
  mapVerticalToHorizontalPlacement,
  Marker,
  MarkerBody,
} from '../../helpers';
import { ReferenceLineAnnotationConfig } from './reference_line_annotations';

// if there's just one axis, put it on the other one
// otherwise use the same axis
// this function assume the chart is vertical
export function getBaseIconPlacement(
  iconPosition: IconPosition | undefined,
  axesMap?: Record<string, unknown>,
  axisMode?: YAxisMode
) {
  if (iconPosition === 'auto') {
    if (axisMode === 'bottom') {
      return Position.Top;
    }
    if (axesMap) {
      if (axisMode === 'left') {
        return axesMap.right ? Position.Left : Position.Right;
      }
      return axesMap.left ? Position.Right : Position.Left;
    }
  }

  if (iconPosition === 'left') {
    return Position.Left;
  }
  if (iconPosition === 'right') {
    return Position.Right;
  }
  if (iconPosition === 'below') {
    return Position.Bottom;
  }
  return Position.Top;
}

export const getSharedStyle = (config: ReferenceLineAnnotationConfig) => ({
  strokeWidth: config.lineWidth || 1,
  stroke: config.color || euiLightVars.euiColorDarkShade,
  dash:
    config.lineStyle === 'dashed'
      ? [(config.lineWidth || 1) * 3, config.lineWidth || 1]
      : config.lineStyle === 'dotted'
      ? [config.lineWidth || 1, config.lineWidth || 1]
      : undefined,
});

export const getLineAnnotationProps = (
  config: ReferenceLineAnnotationConfig,
  labels: { markerLabel?: string; markerBodyLabel?: string },
  axesMap: Record<'left' | 'right', boolean>,
  paddingMap: Partial<Record<Position, number>>,
  groupId: 'left' | 'right' | undefined,
  isHorizontal: boolean
) => {
  // get the position for vertical chart
  const markerPositionVertical = getBaseIconPlacement(
    config.iconPosition,
    axesMap,
    config.axisMode
  );
  // the padding map is built for vertical chart
  const hasReducedPadding = paddingMap[markerPositionVertical] === LINES_MARKER_SIZE;

  return {
    groupId,
    marker: (
      <Marker
        config={config}
        label={labels.markerLabel}
        isHorizontal={isHorizontal}
        hasReducedPadding={hasReducedPadding}
      />
    ),
    markerBody: (
      <MarkerBody
        label={labels.markerBodyLabel}
        isHorizontal={
          (!isHorizontal && config.axisMode === 'bottom') ||
          (isHorizontal && config.axisMode !== 'bottom')
        }
      />
    ),
    // rotate the position if required
    markerPosition: isHorizontal
      ? mapVerticalToHorizontalPlacement(markerPositionVertical)
      : markerPositionVertical,
  };
};

export const getGroupId = (axisMode: YAxisMode | undefined) =>
  axisMode === 'bottom' ? undefined : axisMode === 'right' ? 'right' : 'left';

export const getBottomRect = (
  headerLabel: string | undefined,
  isFillAbove: boolean,
  formatter: FieldFormat | undefined,
  currentValue: number,
  nextValue?: number
) => ({
  coordinates: {
    x0: isFillAbove ? currentValue : nextValue,
    y0: undefined,
    x1: isFillAbove ? nextValue : currentValue,
    y1: undefined,
  },
  header: headerLabel,
  details: formatter?.convert(currentValue) || currentValue.toString(),
});

export const getHorizontalRect = (
  headerLabel: string | undefined,
  isFillAbove: boolean,
  formatter: FieldFormat | undefined,
  currentValue: number,
  nextValue?: number
) => ({
  coordinates: {
    x0: undefined,
    y0: isFillAbove ? currentValue : nextValue,
    x1: undefined,
    y1: isFillAbove ? nextValue : currentValue,
  },
  header: headerLabel,
  details: formatter?.convert(currentValue) || currentValue.toString(),
});
