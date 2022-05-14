/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, Fragment } from 'react';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { groupBy } from 'lodash';
import { euiLightVars } from '@kbn/ui-theme';
import { AnnotationDomainType, LineAnnotation, Position, RectAnnotation } from '@elastic/charts';
import { DatatableRow } from '@kbn/expressions-plugin/common';
import { ExtendedYConfigResult, ReferenceLineLayerConfig } from '../../../common/types';
import {
  getBaseIconPlacement,
  getBottomRect,
  getGroupId,
  getHorizontalRect,
  getLineAnnotationProps,
  getSharedStyle,
} from './utils';
import { LINES_MARKER_SIZE } from '../../helpers';

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

  const headerLabel = columnToLabelMap[yConfig.forAccessor];
  const currentValue = row[yConfig.forAccessor];

  if (yConfig.axisMode === 'bottom') {
    return getBottomRect(headerLabel, isFillAbove, formatter, currentValue, nextValue);
  }

  return getHorizontalRect(headerLabel, isFillAbove, formatter, currentValue, nextValue);
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
    const { axisMode } = yConfig;

    // Find the formatter for the given axis
    const groupId = getGroupId(axisMode);

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

    const props = getLineAnnotationProps(
      yConfig,
      {
        markerLabel: columnToLabelMap[yConfig.forAccessor],
        markerBodyLabel:
          yConfig.textVisibility && !hasReducedPadding
            ? columnToLabelMap[yConfig.forAccessor]
            : undefined,
      },
      axesMap,
      paddingMap,
      groupId,
      isHorizontal
    );

    const sharedStyle = getSharedStyle(yConfig);

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
      <Fragment key={`${layer.layerId}-${yConfig.forAccessor}`}>
        {line}
        {rect}
      </Fragment>
    );
  });

  return <>{referenceLineElements}</>;
};
