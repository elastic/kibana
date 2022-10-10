/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnnotationDomainType, LineAnnotation, Position, RectAnnotation } from '@elastic/charts';
import { euiLightVars } from '@kbn/ui-theme';
import React, { FC } from 'react';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import {
  AxesMap,
  AxisConfiguration,
  getOriginalAxisPosition,
  LINES_MARKER_SIZE,
} from '../../helpers';
import {
  AvailableReferenceLineIcon,
  FillStyle,
  IconPosition,
  LineStyle,
} from '../../../common/types';
import {
  getBaseIconPlacement,
  getBottomRect,
  getHorizontalRect,
  getLineAnnotationProps,
  getSharedStyle,
} from './utils';

export interface ReferenceLineAnnotationConfig {
  id: string;
  name?: string;
  value?: number;
  nextValue?: number;
  icon?: AvailableReferenceLineIcon;
  lineWidth?: number;
  lineStyle?: LineStyle;
  fill?: FillStyle;
  iconPosition?: IconPosition;
  textVisibility?: boolean;
  axisGroup?: AxisConfiguration;
  color?: string;
}

interface Props {
  config: ReferenceLineAnnotationConfig;
  paddingMap: Partial<Record<Position, number>>;
  formatter?: FieldFormat;
  axesMap: AxesMap;
  isHorizontal: boolean;
}

const getRectDataValue = (
  annotationConfig: ReferenceLineAnnotationConfig,
  formatter: FieldFormat | undefined,
  groupId: string
) => {
  const { name, value, nextValue, fill } = annotationConfig;
  const isFillAbove = fill === 'above';

  if (groupId === Position.Bottom) {
    return getBottomRect(name, isFillAbove, formatter, value, nextValue);
  }

  return getHorizontalRect(name, isFillAbove, formatter, value, nextValue);
};

export const ReferenceLineAnnotations: FC<Props> = ({
  config,
  axesMap,
  formatter,
  paddingMap,
  isHorizontal,
}) => {
  const { id, axisGroup, iconPosition, name, textVisibility, value, fill, color } = config;

  const defaultColor = euiLightVars.euiColorDarkShade;
  // get the position for vertical chart
  const markerPositionVertical = getBaseIconPlacement(
    iconPosition,
    axesMap,
    getOriginalAxisPosition(axisGroup?.position ?? Position.Bottom, isHorizontal)
  );
  // the padding map is built for vertical chart
  const hasReducedPadding = paddingMap[markerPositionVertical] === LINES_MARKER_SIZE;

  const props = getLineAnnotationProps(
    config,
    {
      markerLabel: name,
      markerBodyLabel: textVisibility && !hasReducedPadding ? name : undefined,
    },
    axesMap,
    paddingMap,
    isHorizontal
  );

  const sharedStyle = getSharedStyle(config);

  const dataValues = {
    dataValue: value,
    header: name,
    details: formatter?.convert(value) || value?.toString(),
  };

  const line = (
    <LineAnnotation
      {...props}
      id={`${id}-line`}
      key={`${id}-line`}
      dataValues={[dataValues]}
      domainType={
        props.groupId === Position.Bottom
          ? AnnotationDomainType.XDomain
          : AnnotationDomainType.YDomain
      }
      style={{ line: { ...sharedStyle, opacity: 1 } }}
    />
  );

  let rect;
  if (fill && fill !== 'none') {
    const rectDataValues = getRectDataValue(config, formatter, props.groupId);

    rect = (
      <RectAnnotation
        {...props}
        id={`${id}-rect`}
        key={`${id}-rect`}
        dataValues={[rectDataValues]}
        style={{ ...sharedStyle, fill: color || defaultColor, opacity: 0.1 }}
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
