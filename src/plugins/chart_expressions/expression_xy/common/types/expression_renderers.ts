/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnnotationTooltipFormatter } from '@elastic/charts';
import { AvailableAnnotationIcon, EventAnnotationArgs } from '@kbn/event-annotation-plugin/common';
import { XY_VIS_RENDERER } from '../constants';
import { XYProps } from './expression_functions';

export interface XYChartProps {
  args: XYProps;
}

export interface XYRender {
  type: 'render';
  as: typeof XY_VIS_RENDERER;
  value: XYChartProps;
}

export interface CollectiveConfig extends Omit<EventAnnotationArgs, 'icon'> {
  roundedTimestamp: number;
  axisMode: 'bottom';
  icon?: AvailableAnnotationIcon | string;
  customTooltipDetails?: AnnotationTooltipFormatter | undefined;
}
