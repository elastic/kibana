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
import { ReferenceLineAnnotations } from './reference_line_annotations';
import { LayerAccessorsTitles, GroupsConfiguration } from '../../helpers';
import { getAxisGroupForReferenceLine } from './utils';

interface ReferenceLineLayerProps {
  layer: ReferenceLineLayerConfig;
  paddingMap: Partial<Record<Position, number>>;
  isHorizontal: boolean;
  titles?: LayerAccessorsTitles;
  xAxisFormatter: FieldFormat;
  yAxesConfiguration: GroupsConfiguration;
}

export const ReferenceLineLayer: FC<ReferenceLineLayerProps> = ({
  layer,
  yAxesConfiguration,
  xAxisFormatter,
  paddingMap,
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
    const axisGroup = getAxisGroupForReferenceLine(yAxesConfiguration, yConfig);

    const formatter = axisGroup?.formatter || xAxisFormatter;
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

    const axesMap = {
      left: yAxesConfiguration.some((axes) => axes.position === 'left'),
      right: yAxesConfiguration.some((axes) => axes.position === 'right'),
    };

    return (
      <ReferenceLineAnnotations
        key={id}
        config={{
          id,
          value,
          nextValue,
          name,
          ...restAnnotationConfig,
          axisGroup,
        }}
        axesMap={axesMap}
        paddingMap={paddingMap}
        formatter={formatter}
        isHorizontal={isHorizontal}
      />
    );
  });

  return <>{referenceLineElements}</>;
};
