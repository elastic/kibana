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
import { GroupsConfiguration } from '../../helpers';
import { getAxisGroupForReferenceLine } from './utils';

interface ReferenceLineProps {
  layer: ReferenceLineConfig;
  paddingMap: Partial<Record<Position, number>>;
  xAxisFormatter: FieldFormat;
  yAxesConfiguration: GroupsConfiguration;
  isHorizontal: boolean;
  nextValue?: number;
}

export const ReferenceLine: FC<ReferenceLineProps> = ({
  layer,
  yAxesConfiguration,
  xAxisFormatter,
  paddingMap,
  isHorizontal,
  nextValue,
}) => {
  const {
    yConfig: [yConfig],
  } = layer;

  if (!yConfig) {
    return null;
  }

  const { value } = yConfig;

  const axisGroup = getAxisGroupForReferenceLine(yAxesConfiguration, yConfig);

  const formatter = axisGroup?.formatter || xAxisFormatter;
  const id = `${layer.layerId}-${value}`;

  const axesMap = {
    left: yAxesConfiguration.some((axes) => axes.position === 'left'),
    right: yAxesConfiguration.some((axes) => axes.position === 'right'),
  };

  return (
    <ReferenceLineAnnotations
      config={{ id, ...yConfig, nextValue, axisGroup }}
      paddingMap={paddingMap}
      axesMap={axesMap}
      formatter={formatter}
      isHorizontal={isHorizontal}
    />
  );
};
