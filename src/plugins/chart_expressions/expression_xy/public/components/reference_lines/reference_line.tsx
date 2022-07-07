/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { Position } from '@elastic/charts';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { ReferenceLineConfig } from '../../../common/types';
import { ReferenceLineAnnotations } from './reference_line_annotations';
import { AxesMap, GroupsConfiguration } from '../../helpers';
import { getAxisGroupForReferenceLine } from './utils';

interface ReferenceLineProps {
  layer: ReferenceLineConfig;
  paddingMap: Partial<Record<Position, number>>;
  xAxisFormatter: FieldFormat;
  axesConfiguration: GroupsConfiguration;
  isHorizontal: boolean;
  nextValue?: number;
  yAxesMap: AxesMap;
}

export const ReferenceLine: FC<ReferenceLineProps> = ({
  layer,
  axesConfiguration,
  xAxisFormatter,
  paddingMap,
  isHorizontal,
  nextValue,
  yAxesMap,
}) => {
  const {
    decorations: [decorationConfig],
  } = layer;

  if (!decorationConfig) {
    return null;
  }

  const { value } = decorationConfig;

  const axisGroup = getAxisGroupForReferenceLine(axesConfiguration, decorationConfig, isHorizontal);

  const formatter = axisGroup?.formatter || xAxisFormatter;
  const id = `${layer.layerId}-${value}`;

  return (
    <ReferenceLineAnnotations
      config={{ id, ...decorationConfig, nextValue, axisGroup }}
      paddingMap={paddingMap}
      axesMap={yAxesMap}
      formatter={formatter}
      isHorizontal={isHorizontal}
    />
  );
};
