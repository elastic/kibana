/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import { Position } from '@elastic/charts';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { ReferenceLineConfig } from '../../../common/types';
import { ReferenceLineAnnotations } from './reference_line_annotations';
import { AxesMap, GroupsConfiguration } from '../../helpers';
import { FormattersMap, getAxisGroupForReferenceLine } from './utils';

interface ReferenceLineProps {
  layer: ReferenceLineConfig;
  paddingMap: Partial<Record<Position, number>>;
  xAxisFormatter: FieldFormat;
  formatters: FormattersMap;
  axesConfiguration: GroupsConfiguration;
  isHorizontal: boolean;
  nextValue?: number;
  yAxesMap: AxesMap;
}

export const ReferenceLine: FC<ReferenceLineProps> = ({
  layer,
  axesConfiguration,
  xAxisFormatter,
  formatters,
  paddingMap,
  isHorizontal,
  nextValue,
  yAxesMap,
}) => {
  const {
    decorations: [decorationConfig],
    columnToLabel,
  } = layer;

  if (!decorationConfig) {
    return null;
  }

  const { value } = decorationConfig;
  const columnToLabelMap: Record<string, string> = columnToLabel ? JSON.parse(columnToLabel) : {};

  const axisGroup = getAxisGroupForReferenceLine(axesConfiguration, decorationConfig, isHorizontal);

  const formatter =
    formatters[decorationConfig.forAccessor] || axisGroup?.formatter || xAxisFormatter;
  const id = `${layer.layerId}-${value}`;
  const name = decorationConfig.textVisibility
    ? columnToLabelMap[decorationConfig.forAccessor]
    : undefined;

  return (
    <ReferenceLineAnnotations
      config={{ id, ...decorationConfig, name, nextValue, axisGroup }}
      paddingMap={paddingMap}
      axesMap={yAxesMap}
      formatter={formatter}
      isHorizontal={isHorizontal}
    />
  );
};
