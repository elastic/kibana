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
import { getBaseIconPlacement } from './utils';
import {
  LINES_MARKER_SIZE,
  mapVerticalToHorizontalPlacement,
  Marker,
  MarkerBody,
} from '../../helpers';

interface ReferenceLineProps {
  layer: ReferenceLineConfig;
  paddingMap: Partial<Record<Position, number>>;
  formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
  axesMap: Record<'left' | 'right', boolean>;
  isHorizontal: boolean;
}

const getRectDataValue = (yConfig: ReferenceLineYConfig, formatter: FieldFormat | undefined) => {
  const isFillAbove = yConfig.fill === 'above';

  if (yConfig.axisMode === 'bottom') {
    return {
      coordinates: {
        x0: isFillAbove ? yConfig.value : undefined,
        y0: undefined,
        x1: isFillAbove ? undefined : yConfig.value,
        y1: undefined,
      },
      header: yConfig.name,
      details: formatter?.convert(yConfig.value) || yConfig.value,
    };
  }

  return {
    coordinates: {
      x0: undefined,
      y0: isFillAbove ? yConfig.value : undefined,
      x1: undefined,
      y1: isFillAbove ? undefined : yConfig.value,
    },
    header: yConfig.name,
    details: formatter?.convert(yConfig.value) || yConfig.value,
  };
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
  const groupId = axisMode === 'bottom' ? undefined : axisMode === 'right' ? 'right' : 'left';

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

  const props = {
    groupId,
    marker: (
      <Marker
        config={yConfig}
        label={name}
        isHorizontal={isHorizontal}
        hasReducedPadding={hasReducedPadding}
      />
    ),
    markerBody: (
      <MarkerBody
        label={yConfig.textVisibility && !hasReducedPadding ? name : undefined}
        isHorizontal={
          (!isHorizontal && axisMode === 'bottom') || (isHorizontal && axisMode !== 'bottom')
        }
      />
    ),
    // rotate the position if required
    markerPosition: isHorizontal
      ? mapVerticalToHorizontalPlacement(markerPositionVertical)
      : markerPositionVertical,
  };

  const sharedStyle = {
    strokeWidth: yConfig.lineWidth || 1,
    stroke: yConfig.color || defaultColor,
    dash:
      yConfig.lineStyle === 'dashed'
        ? [(yConfig.lineWidth || 1) * 3, yConfig.lineWidth || 1]
        : yConfig.lineStyle === 'dotted'
        ? [yConfig.lineWidth || 1, yConfig.lineWidth || 1]
        : undefined,
  };

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
