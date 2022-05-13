/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { groupBy } from 'lodash';
import { euiLightVars } from '@kbn/ui-theme';
import { AnnotationDomainType, LineAnnotation, Position, RectAnnotation } from '@elastic/charts';
import { DatatableRow } from '@kbn/expressions-plugin/common';
import { ExtendedYConfigResult, ReferenceLineLayerConfig } from '../../../common/types';
import { getBaseIconPlacement } from './utils';
import {
  LINES_MARKER_SIZE,
  mapVerticalToHorizontalPlacement,
  Marker,
  MarkerBody,
} from '../../helpers';

interface ReferenceLineLayerProps {
  layer: ReferenceLineLayerConfig;
  formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
  paddingMap: Partial<Record<Position, number>>;
  axesMap: Record<'left' | 'right', boolean>;
  isHorizontal: boolean;
}

const getRectDataValue = (
  yConfig: ExtendedYConfigResult,
  columnToLabelMap: Record<string, string>,
  row: DatatableRow,
  formatter: FieldFormat | undefined,
  yConfigsWithSameDirection: ExtendedYConfigResult[]
) => {
  const isFillAbove = yConfig.fill === 'above';
  const indexFromSameType = yConfigsWithSameDirection.findIndex(
    ({ forAccessor }) => forAccessor === yConfig.forAccessor
  );

  const shouldCheckNextReferenceLine = indexFromSameType < yConfigsWithSameDirection.length - 1;

  const nextValue = shouldCheckNextReferenceLine
    ? row[yConfigsWithSameDirection[indexFromSameType + 1].forAccessor]
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
      details: formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
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
    details: formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
  };
};

export const ReferenceLineLayer: FC<ReferenceLineLayerProps> = ({
  layer,
  formatters,
  paddingMap,
  axesMap,
  isHorizontal,
}) => {
  if (!layer.yConfig) {
    return null;
  }

  const { columnToLabel, yConfig: yConfigs, table } = layer;
  const columnToLabelMap: Record<string, string> = columnToLabel ? JSON.parse(columnToLabel) : {};

  const row = table.rows[0];

  const yConfigByValue = yConfigs.sort(
    ({ forAccessor: idA }, { forAccessor: idB }) => row[idA] - row[idB]
  );

  const groupedByDirection = groupBy(yConfigByValue, 'fill');
  if (groupedByDirection.below) {
    groupedByDirection.below.reverse();
  }
  const referenceLineElements = yConfigByValue.flatMap((yConfig) => {
    // Find the formatter for the given axis
    const groupId =
      yConfig.axisMode === 'bottom' ? undefined : yConfig.axisMode === 'right' ? 'right' : 'left';

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
          label={columnToLabelMap[yConfig.forAccessor]}
          isHorizontal={isHorizontal}
          hasReducedPadding={hasReducedPadding}
        />
      ),
      markerBody: (
        <MarkerBody
          label={
            yConfig.textVisibility && !hasReducedPadding
              ? columnToLabelMap[yConfig.forAccessor]
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

    const dataValuesSample = {
      dataValue: row[yConfig.forAccessor],
      header: columnToLabelMap[yConfig.forAccessor],
      details: formatter?.convert(row[yConfig.forAccessor]) || row[yConfig.forAccessor],
    };

    const dataValues = new Array(table.rows.length).fill(dataValuesSample);

    const line = (
      <LineAnnotation
        {...props}
        id={`${layer.layerId}-${yConfig.forAccessor}-line`}
        key={`${layer.layerId}-${yConfig.forAccessor}-line`}
        dataValues={dataValues}
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

    let rect;
    if (yConfig.fill && yConfig.fill !== 'none') {
      const rectDataValuesSample = getRectDataValue(
        yConfig,
        columnToLabelMap,
        row,
        formatter,
        groupedByDirection[yConfig.fill]
      );

      const rectDataValues = new Array(table.rows.length).fill(rectDataValuesSample);

      rect = (
        <RectAnnotation
          {...props}
          id={`${layer.layerId}-${yConfig.forAccessor}-rect`}
          key={`${layer.layerId}-${yConfig.forAccessor}-rect`}
          dataValues={rectDataValues}
          style={{
            ...sharedStyle,
            fill: yConfig.color || defaultColor,
            opacity: 0.1,
          }}
        />
      );
    }
    return (
      <>
        {line}
        {rect}
      </>
    );
  });

  return <>{referenceLineElements}</>;
};
