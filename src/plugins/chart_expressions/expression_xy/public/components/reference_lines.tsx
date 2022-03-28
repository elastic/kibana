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
import { EuiIcon } from '@elastic/eui';
import { RectAnnotation, AnnotationDomainType, LineAnnotation, Position } from '@elastic/charts';
import { euiLightVars } from '@kbn/ui-theme';
import type { FieldFormat } from '../../../../field_formats/common';
import type { IconPosition, ReferenceLineLayerArgs, YAxisMode } from '../../common/types';
import type { LensMultiTable } from '../../common/types';
import { hasIcon } from '../helpers';

export const REFERENCE_LINE_MARKER_SIZE = 20;

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

// Note: it does not take into consideration whether the reference line is in view or not
export const getReferenceLineRequiredPaddings = (
  referenceLineLayers: ReferenceLineLayerArgs[],
  axesMap: Record<'left' | 'right', unknown>
) => {
  // collect all paddings for the 4 axis: if any text is detected double it.
  const paddings: Partial<Record<Position, number>> = {};
  const icons: Partial<Record<Position, number>> = {};
  referenceLineLayers.forEach((layer) => {
    layer.yConfig?.forEach(({ axisMode, icon, iconPosition, textVisibility }) => {
      if (axisMode && (hasIcon(icon) || textVisibility)) {
        const placement = getBaseIconPlacement(iconPosition, axisMode, axesMap);
        paddings[placement] = Math.max(
          paddings[placement] || 0,
          REFERENCE_LINE_MARKER_SIZE * (textVisibility ? 2 : 1) // double the padding size if there's text
        );
        icons[placement] = (icons[placement] || 0) + (hasIcon(icon) ? 1 : 0);
      }
    });
  });
  // post-process the padding based on the icon presence:
  // if no icon is present for the placement, just reduce the padding
  (Object.keys(paddings) as Position[]).forEach((placement) => {
    if (!icons[placement]) {
      paddings[placement] = REFERENCE_LINE_MARKER_SIZE;
    }
  });

  return paddings;
};

function mapVerticalToHorizontalPlacement(placement: Position) {
  switch (placement) {
    case Position.Top:
      return Position.Right;
    case Position.Bottom:
      return Position.Left;
    case Position.Left:
      return Position.Bottom;
    case Position.Right:
      return Position.Top;
  }
}

// if there's just one axis, put it on the other one
// otherwise use the same axis
// this function assume the chart is vertical
function getBaseIconPlacement(
  iconPosition: IconPosition | undefined,
  axisMode: YAxisMode | undefined,
  axesMap: Record<string, unknown>
) {
  if (iconPosition === 'auto') {
    if (axisMode === 'bottom') {
      return Position.Top;
    }
    if (axisMode === 'left') {
      return axesMap.right ? Position.Left : Position.Right;
    }
    return axesMap.left ? Position.Right : Position.Left;
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

function getMarkerBody(label: string | undefined, isHorizontal: boolean) {
  if (!label) {
    return;
  }
  if (isHorizontal) {
    return (
      <div className="eui-textTruncate" style={{ maxWidth: REFERENCE_LINE_MARKER_SIZE * 3 }}>
        {label}
      </div>
    );
  }
  return (
    <div
      className="xyDecorationRotatedWrapper"
      style={{
        width: REFERENCE_LINE_MARKER_SIZE,
      }}
    >
      <div
        className="eui-textTruncate xyDecorationRotatedWrapper__label"
        style={{
          maxWidth: REFERENCE_LINE_MARKER_SIZE * 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

interface MarkerConfig {
  axisMode?: YAxisMode;
  icon?: string;
  textVisibility?: boolean;
}

function getMarkerToShow(
  markerConfig: MarkerConfig,
  label: string | undefined,
  isHorizontal: boolean,
  hasReducedPadding: boolean
) {
  // show an icon if present
  if (hasIcon(markerConfig.icon)) {
    return <EuiIcon type={markerConfig.icon} />;
  }
  // if there's some text, check whether to show it as marker, or just show some padding for the icon
  if (markerConfig.textVisibility) {
    if (hasReducedPadding) {
      return getMarkerBody(
        label,
        (!isHorizontal && markerConfig.axisMode === 'bottom') ||
          (isHorizontal && markerConfig.axisMode !== 'bottom')
      );
    }
    return <EuiIcon type="empty" />;
  }
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
          ({ forAccessor: idA }, { forAccessor: idB }) => row[idA] - row[idB]
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

          const formatter = formatters[groupId || 'bottom'];

          const defaultColor = euiLightVars.euiColorDarkShade;

          // get the position for vertical chart
          const markerPositionVertical = getBaseIconPlacement(
            yConfig.iconPosition,
            yConfig.axisMode,
            axesMap
          );
          // the padding map is built for vertical chart
          const hasReducedPadding =
            paddingMap[markerPositionVertical] === REFERENCE_LINE_MARKER_SIZE;

          const props = {
            groupId,
            marker: getMarkerToShow(
              yConfig,
              columnToLabelMap[yConfig.forAccessor],
              isHorizontal,
              hasReducedPadding
            ),
            markerBody: getMarkerBody(
              yConfig.textVisibility && !hasReducedPadding
                ? columnToLabelMap[yConfig.forAccessor]
                : undefined,
              (!isHorizontal && yConfig.axisMode === 'bottom') ||
                (isHorizontal && yConfig.axisMode !== 'bottom')
            ),
            // rotate the position if required
            markerPosition: isHorizontal
              ? mapVerticalToHorizontalPlacement(markerPositionVertical)
              : markerPositionVertical,
          };
          const annotations = [];

          const dashStyle =
            yConfig.lineStyle === 'dashed'
              ? [(yConfig.lineWidth || 1) * 3, yConfig.lineWidth || 1]
              : yConfig.lineStyle === 'dotted'
              ? [yConfig.lineWidth || 1, yConfig.lineWidth || 1]
              : undefined;

          const sharedStyle = {
            strokeWidth: yConfig.lineWidth || 1,
            stroke: yConfig.color || defaultColor,
            dash: dashStyle,
          };

          annotations.push(
            <LineAnnotation
              {...props}
              id={`${layerId}-${yConfig.forAccessor}-line`}
              key={`${layerId}-${yConfig.forAccessor}-line`}
              dataValues={table.rows.map(() => ({
                dataValue: row[yConfig.forAccessor],
                header: columnToLabelMap[yConfig.forAccessor],
                details: formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
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
              ({ forAccessor }) => forAccessor === yConfig.forAccessor
            );
            const shouldCheckNextReferenceLine =
              indexFromSameType < groupedByDirection[yConfig.fill].length - 1;
            annotations.push(
              <RectAnnotation
                {...props}
                id={`${layerId}-${yConfig.forAccessor}-rect`}
                key={`${layerId}-${yConfig.forAccessor}-rect`}
                dataValues={table.rows.map(() => {
                  const nextValue = shouldCheckNextReferenceLine
                    ? row[groupedByDirection[yConfig.fill!][indexFromSameType + 1].forAccessor]
                    : undefined;
                  if (yConfig.axisMode === 'bottom') {
                    return {
                      coordinates: {
                        x0: isFillAbove ? row[yConfig.forAccessor] : nextValue,
                        y0: undefined,
                        x1: isFillAbove ? nextValue : row[yConfig.forAccessor],
                        y1: undefined,
                      },
                      header: columnToLabelMap[yConfig.forAccessor],
                      details:
                        formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
                    };
                  }
                  return {
                    coordinates: {
                      x0: undefined,
                      y0: isFillAbove ? row[yConfig.forAccessor] : nextValue,
                      x1: undefined,
                      y1: isFillAbove ? nextValue : row[yConfig.forAccessor],
                    },
                    header: columnToLabelMap[yConfig.forAccessor],
                    details:
                      formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
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
