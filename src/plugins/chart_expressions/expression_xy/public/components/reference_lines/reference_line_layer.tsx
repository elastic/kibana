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
    const axisGroup = getAxisGroupForReferenceLine(yAxesConfiguration, decorationConfig);

    const formatter = axisGroup?.formatter || xAxisFormatter;
    const name =
      columnToLabelMap[decorationConfig.forAccessor] ??
      titles?.yTitles?.[decorationConfig.forAccessor];
    const value = row[decorationConfig.forAccessor];
    const yDecorationsWithSameDirection = groupedByDirection[decorationConfig.fill!];
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
