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
import { getGroupId } from './utils';
import { ReferenceLineAnnotations } from './reference_line_annotations';

interface ReferenceLineProps {
  layer: ReferenceLineConfig;
  paddingMap: Partial<Record<Position, number>>;
  formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
  axesMap: Record<'left' | 'right', boolean>;
  isHorizontal: boolean;
}

export const ReferenceLine: FC<ReferenceLineProps> = ({
  layer,
  axesMap,
  formatters,
  paddingMap,
  isHorizontal,
}) => {
  const {
    yConfig: [yConfig],
  } = layer;

  if (!yConfig) {
    return null;
  }

  const { axisMode, value } = yConfig;

  // Find the formatter for the given axis
  const groupId = getGroupId(axisMode);

  const formatter = formatters[groupId || 'bottom'];
  const id = `${layer.layerId}-${value}`;

  return (
    <ReferenceLineAnnotations
      config={{ id, ...yConfig }}
      paddingMap={paddingMap}
      axesMap={axesMap}
      formatter={formatter}
      isHorizontal={isHorizontal}
    />
  );
};
