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
import { Position } from '@elastic/charts';
import { ReferenceLineLayerConfig } from '../../../common/types';
import { getGroupId } from './utils';
import { ReferenceLineAnnotations } from './reference_line_annotations';
import { LayerAccessorsTitles } from '../../helpers';

interface ReferenceLineLayerProps {
  layer: ReferenceLineLayerConfig;
  formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
  paddingMap: Partial<Record<Position, number>>;
  axesMap: Record<'left' | 'right', boolean>;
  isHorizontal: boolean;
  titles?: LayerAccessorsTitles;
}

export const ReferenceLineLayer: FC<ReferenceLineLayerProps> = ({
  layer,
  formatters,
  paddingMap,
  axesMap,
  isHorizontal,
  titles,
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
    const name = columnToLabelMap[yConfig.forAccessor] ?? titles?.yTitles?.[yConfig.forAccessor];
    const value = row[yConfig.forAccessor];
    const yConfigsWithSameDirection = groupedByDirection[yConfig.fill!];
    const indexFromSameType = yConfigsWithSameDirection.findIndex(
      ({ forAccessor }) => forAccessor === yConfig.forAccessor
    );

    const shouldCheckNextReferenceLine = indexFromSameType < yConfigsWithSameDirection.length - 1;

    const nextValue = shouldCheckNextReferenceLine
      ? row[yConfigsWithSameDirection[indexFromSameType + 1].forAccessor]
      : undefined;

    const { forAccessor, type, ...restAnnotationConfig } = yConfig;
    const id = `${layer.layerId}-${yConfig.forAccessor}`;

    return (
      <ReferenceLineAnnotations
        key={id}
        config={{
          id,
          value,
          nextValue,
          name,
          ...restAnnotationConfig,
        }}
        paddingMap={paddingMap}
        axesMap={axesMap}
        formatter={formatter}
        isHorizontal={isHorizontal}
      />
    );
  });

  return <>{referenceLineElements}</>;
};
