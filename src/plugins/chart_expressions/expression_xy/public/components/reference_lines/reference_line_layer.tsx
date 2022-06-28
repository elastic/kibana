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
import { LayerAccessorsTitles, GroupsConfiguration, AxesMap } from '../../helpers';
import { getAxisGroupForReferenceLine } from './utils';

interface ReferenceLineLayerProps {
  layer: ReferenceLineLayerConfig;
  paddingMap: Partial<Record<Position, number>>;
  isHorizontal: boolean;
  titles?: LayerAccessorsTitles;
  xAxisFormatter: FieldFormat;
  axesConfiguration: GroupsConfiguration;
  yAxesMap: AxesMap;
}

export const ReferenceLineLayer: FC<ReferenceLineLayerProps> = ({
  layer,
  axesConfiguration,
  xAxisFormatter,
  paddingMap,
  isHorizontal,
  titles,
  yAxesMap,
}) => {
  if (!layer.decorations) {
    return null;
  }

  const { columnToLabel, decorations, table } = layer;
  const columnToLabelMap: Record<string, string> = columnToLabel ? JSON.parse(columnToLabel) : {};

  const row = table.rows[0];

  const decorationConfigsByValue = decorations.sort(
    ({ forAccessor: idA }, { forAccessor: idB }) => row[idA] - row[idB]
  );

  const groupedByDirection = groupBy(decorationConfigsByValue, 'fill');
  if (groupedByDirection.below) {
    groupedByDirection.below.reverse();
  }

  const referenceLineElements = decorationConfigsByValue.flatMap((decorationConfig) => {
    const axisGroup = getAxisGroupForReferenceLine(
      axesConfiguration,
      decorationConfig,
      isHorizontal
    );

    const formatter = axisGroup?.formatter || xAxisFormatter;
    const name =
      columnToLabelMap[decorationConfig.forAccessor] ??
      titles?.yTitles?.[decorationConfig.forAccessor];
    const value = row[decorationConfig.forAccessor];
    const yDecorationsWithSameDirection = groupedByDirection[decorationConfig.fill!].filter(
      (yDecoration) =>
        getAxisGroupForReferenceLine(axesConfiguration, yDecoration, isHorizontal) === axisGroup
    );
    const indexFromSameType = yDecorationsWithSameDirection.findIndex(
      ({ forAccessor }) => forAccessor === decorationConfig.forAccessor
    );

    const shouldCheckNextReferenceLine =
      indexFromSameType < yDecorationsWithSameDirection.length - 1;

    const nextValue = shouldCheckNextReferenceLine
      ? row[yDecorationsWithSameDirection[indexFromSameType + 1].forAccessor]
      : undefined;

    const { forAccessor, type, ...restAnnotationConfig } = decorationConfig;
    const id = `${layer.layerId}-${decorationConfig.forAccessor}`;

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
        axesMap={yAxesMap}
        paddingMap={paddingMap}
        formatter={formatter}
        isHorizontal={isHorizontal}
      />
    );
  });

  return <>{referenceLineElements}</>;
};
