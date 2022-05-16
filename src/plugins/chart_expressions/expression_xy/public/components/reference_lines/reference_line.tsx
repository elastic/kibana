/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { euiLightVars } from '@kbn/ui-theme';
import { AnnotationDomainType, LineAnnotation, Position, RectAnnotation } from '@elastic/charts';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { ReferenceLineConfig, ReferenceLineYConfig } from '../../../common/types';
import {
  getBottomRect,
  getGroupId,
  getHorizontalRect,
  getLineAnnotationProps,
  getSharedStyle,
} from './utils';

interface ReferenceLineProps {
  layer: ReferenceLineConfig;
  paddingMap: Partial<Record<Position, number>>;
  formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
  axesMap: Record<'left' | 'right', boolean>;
  isHorizontal: boolean;
}

const getRectDataValue = (yConfig: ReferenceLineYConfig, formatter: FieldFormat | undefined) => {
  const { name, value, fill } = yConfig;
  const isFillAbove = fill === 'above';

  if (yConfig.axisMode === 'bottom') {
    return getBottomRect(name, isFillAbove, formatter, value);
  }

  return getHorizontalRect(name, isFillAbove, formatter, value);
};

export const ReferenceLine: FC<ReferenceLineProps> = ({
  layer,
  axesMap,
  formatters,
  paddingMap,
  isHorizontal,
}) => {
  const {
    lineLength,
    yConfig: [yConfig],
  } = layer;

  if (!yConfig) {
    return null;
  }
  const { name, value, axisMode } = yConfig;

  // Find the formatter for the given axis
  const groupId = getGroupId(axisMode);

  const formatter = formatters[groupId || 'bottom'];

  const defaultColor = euiLightVars.euiColorDarkShade;

  const props = getLineAnnotationProps(
    yConfig,
    yConfig.textVisibility
      ? {
          markerLabel: yConfig.icon ? undefined : name,
          markerBodyLabel: yConfig.icon ? name : undefined,
        }
      : {},
    axesMap,
    paddingMap,
    groupId,
    isHorizontal
  );

  const sharedStyle = getSharedStyle(yConfig);

  const dataValuesSample = {
    dataValue: value,
    header: name,
    details: formatter?.convert(value) || value,
  };

  const dataValues = new Array(lineLength).fill(dataValuesSample);

  const line = (
    <LineAnnotation
      {...props}
      id={`${layer.layerId}-${value}-line`}
      key={`${layer.layerId}-${value}-line`}
      dataValues={dataValues}
      domainType={
        yConfig.axisMode === 'bottom' ? AnnotationDomainType.XDomain : AnnotationDomainType.YDomain
      }
      style={{ line: { ...sharedStyle, opacity: 1 } }}
    />
  );

  let rect;
  if (yConfig.fill && yConfig.fill !== 'none') {
    const rectDataValuesSample = getRectDataValue(yConfig, formatter);
    const rectDataValues = new Array(lineLength).fill(rectDataValuesSample);

    rect = (
      <RectAnnotation
        {...props}
        id={`${layer.layerId}-${value}-rect`}
        key={`${layer.layerId}-${value}-rect`}
        dataValues={rectDataValues}
        style={{ ...sharedStyle, fill: yConfig.color || defaultColor, opacity: 0.1 }}
      />
    );
  }
  return (
    <>
      {line}
      {rect}
    </>
  );
};
