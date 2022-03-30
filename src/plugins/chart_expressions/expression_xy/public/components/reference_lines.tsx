/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './reference_lines.scss';

import React from 'react';
import { groupBy } from 'lodash';
import { RectAnnotation, AnnotationDomainType, LineAnnotation, Position } from '@elastic/charts';
import { euiLightVars } from '@kbn/ui-theme';
import { getAccessorByDimension } from '../../../../../plugins/visualizations/common/utils';
import type { FieldFormat } from '../../../../field_formats/common';
import type { IconPosition, ReferenceLineLayerArgs, YAxisMode } from '../../common/types';
import type { LensMultiTable } from '../../common/types';
import {
  LINES_MARKER_SIZE,
  mapVerticalToHorizontalPlacement,
  Marker,
  MarkerBody,
} from '../helpers';

export const computeChartMargins = (
  referenceLinePaddings: Partial<Record<Position, number>>,
  labelVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  titleVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  axesMap: Record<'left' | 'right', unknown>,
  isHorizontal: boolean
) => {
  const result: Partial<Record<Position, number>> = {};
  if (!labelVisibility?.x && !titleVisibility?.x && referenceLinePaddings.bottom) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('bottom') : 'bottom';
    result[placement] = referenceLinePaddings.bottom;
  }
  if (
    referenceLinePaddings.left &&
    (isHorizontal || (!labelVisibility?.yLeft && !titleVisibility?.yLeft))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('left') : 'left';
    result[placement] = referenceLinePaddings.left;
  }
  if (
    referenceLinePaddings.right &&
    (isHorizontal || !axesMap.right || (!labelVisibility?.yRight && !titleVisibility?.yRight))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('right') : 'right';
    result[placement] = referenceLinePaddings.right;
  }
  // there's no top axis, so just check if a margin has been computed
  if (referenceLinePaddings.top) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('top') : 'top';
    result[placement] = referenceLinePaddings.top;
  }
  return result;
};

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

export interface ReferenceLineAnnotationsProps {
  layers: ReferenceLineLayerArgs[];
  data: LensMultiTable;
  formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
  axesMap: Record<'left' | 'right', boolean>;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
}

export const ReferenceLineAnnotations = ({
  layers,
  data,
  formatters,
  axesMap,
  isHorizontal,
  paddingMap,
}: ReferenceLineAnnotationsProps) => {
  return (
    <>
      {layers.flatMap((layer) => {
        if (!layer.yConfig) {
          return [];
        }
        const { columnToLabel, yConfig: yConfigs, layerId } = layer;
        const columnToLabelMap: Record<string, string> = columnToLabel
          ? JSON.parse(columnToLabel)
          : {};
        const table = data.tables[layerId];

        const row = table.rows[0];

        const yConfigByValue = yConfigs.sort(
          ({ forAccessor: idA }, { forAccessor: idB }) =>
            row[getAccessorByDimension(idA, table.columns)] -
            row[getAccessorByDimension(idB, table.columns)]
        );

        const groupedByDirection = groupBy(yConfigByValue, 'fill');
        if (groupedByDirection.below) {
          groupedByDirection.below.reverse();
        }

        return yConfigByValue.flatMap((yConfig, i) => {
          // Find the formatter for the given axis
          const groupId =
            yConfig.axisMode === 'bottom'
              ? undefined
              : yConfig.axisMode === 'right'
              ? 'right'
              : 'left';

          const forAccessor = getAccessorByDimension(yConfig.forAccessor, table.columns);

          const formatter = formatters[groupId || 'bottom'];

          const defaultColor = euiLightVars.euiColorDarkShade;

          // get the position for vertical chart
          const markerPositionVertical = getBaseIconPlacement(
            yConfig.iconPosition,
            axesMap,
            yConfig.axisMode
          );
          // the padding map is built for vertical chart
          const hasReducedPadding = paddingMap[markerPositionVertical] === LINES_MARKER_SIZE;

          const props = {
            groupId,
            marker: (
              <Marker
                config={yConfig}
                label={columnToLabelMap[forAccessor]}
                isHorizontal={isHorizontal}
                hasReducedPadding={hasReducedPadding}
              />
            ),
            markerBody: (
              <MarkerBody
                label={
                  yConfig.textVisibility && !hasReducedPadding
                    ? columnToLabelMap[forAccessor]
                    : undefined
                }
                isHorizontal={
                  (!isHorizontal && yConfig.axisMode === 'bottom') ||
                  (isHorizontal && yConfig.axisMode !== 'bottom')
                }
              />
            ),
            // rotate the position if required
            markerPosition: isHorizontal
              ? mapVerticalToHorizontalPlacement(markerPositionVertical)
              : markerPositionVertical,
          };
          const annotations = [];

          const sharedStyle = {
            strokeWidth: yConfig.lineWidth || 1,
            stroke: yConfig.color || defaultColor,
            dash:
              yConfig.lineStyle === 'dashed'
                ? [(yConfig.lineWidth || 1) * 3, yConfig.lineWidth || 1]
                : yConfig.lineStyle === 'dotted'
                ? [yConfig.lineWidth || 1, yConfig.lineWidth || 1]
                : undefined,
          };

          annotations.push(
            <LineAnnotation
              {...props}
              id={`${layerId}-${forAccessor}-line`}
              key={`${layerId}-${forAccessor}-line`}
              dataValues={table.rows.map(() => ({
                dataValue: row[forAccessor],
                header: columnToLabelMap[forAccessor],
                details: formatter?.convert(row[forAccessor]) || row[forAccessor],
              }))}
              domainType={
                yConfig.axisMode === 'bottom'
                  ? AnnotationDomainType.XDomain
                  : AnnotationDomainType.YDomain
              }
              style={{
                line: {
                  ...sharedStyle,
                  opacity: 1,
                },
              }}
            />
          );

          if (yConfig.fill && yConfig.fill !== 'none') {
            const isFillAbove = yConfig.fill === 'above';
            const indexFromSameType = groupedByDirection[yConfig.fill].findIndex(
              (yConfigResult) =>
                getAccessorByDimension(yConfigResult.forAccessor, table.columns) === forAccessor
            );
            const shouldCheckNextReferenceLine =
              indexFromSameType < groupedByDirection[yConfig.fill].length - 1;
            annotations.push(
              <RectAnnotation
                {...props}
                id={`${layerId}-${forAccessor}-rect`}
                key={`${layerId}-${forAccessor}-rect`}
                dataValues={table.rows.map(() => {
                  const nextValue = shouldCheckNextReferenceLine
                    ? row[
                        getAccessorByDimension(
                          groupedByDirection[yConfig.fill!][indexFromSameType + 1].forAccessor,
                          table.columns
                        )
                      ]
                    : undefined;
                  if (yConfig.axisMode === 'bottom') {
                    return {
                      coordinates: {
                        x0: isFillAbove ? row[forAccessor] : nextValue,
                        y0: undefined,
                        x1: isFillAbove ? nextValue : row[forAccessor],
                        y1: undefined,
                      },
                      header: columnToLabelMap[forAccessor],
                      details: formatter?.convert(row[forAccessor]) || row[forAccessor],
                    };
                  }
                  return {
                    coordinates: {
                      x0: undefined,
                      y0: isFillAbove ? row[forAccessor] : nextValue,
                      x1: undefined,
                      y1: isFillAbove ? nextValue : row[forAccessor],
                    },
                    header: columnToLabelMap[forAccessor],
                    details: formatter?.convert(row[forAccessor]) || row[forAccessor],
                  };
                })}
                style={{
                  ...sharedStyle,
                  fill: yConfig.color || defaultColor,
                  opacity: 0.1,
                }}
              />
            );
          }
          return annotations;
        });
      })}
    </>
  );
};
