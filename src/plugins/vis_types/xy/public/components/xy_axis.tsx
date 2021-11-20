/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import { Axis } from '@elastic/charts';

import { AxisConfig } from '../types';

type XYAxisPros = AxisConfig<any>;

export const XYAxis: FC<XYAxisPros> = ({
  id,
  title,
  show,
  position,
  groupId,
  grid,
  ticks,
  domain,
  style,
  integersOnly,
  timeAxisLayerCount,
}) => (
  <Axis
    id={`${id}__axis`}
    groupId={groupId}
    hide={!show}
    title={title}
    style={style}
    domain={domain}
    position={position}
    integersOnly={integersOnly}
    showGridLines={grid?.show}
    tickFormat={ticks?.formatter}
    labelFormat={ticks?.labelFormatter}
    showOverlappingLabels={ticks?.showOverlappingLabels}
    showDuplicatedTicks={ticks?.showDuplicates}
    timeAxisLayerCount={timeAxisLayerCount}
  />
);
