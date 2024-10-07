/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CustomAnnotationTooltip } from '@elastic/charts';
import type { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import { ManualPointEventAnnotationArgs } from '@kbn/event-annotation-plugin/common';
import type { AvailableAnnotationIcon } from '@kbn/event-annotation-common';
import { XY_VIS_RENDERER } from '../constants';
import type { AllowedXYOverrides, XYProps } from './expression_functions';

export interface XYChartProps {
  args: XYProps;
  syncTooltips: boolean;
  syncCursor: boolean;
  syncColors: boolean;
  canNavigateToLens?: boolean;
  overrides?: AllowedXYOverrides & AllowedSettingsOverrides & AllowedChartOverrides;
}

export interface XYRender {
  type: 'render';
  as: typeof XY_VIS_RENDERER;
  value: XYChartProps;
}

export interface MergedAnnotation extends Omit<ManualPointEventAnnotationArgs, 'icon'> {
  timebucket: number;
  position: 'bottom';
  icon?: AvailableAnnotationIcon | string;
  customTooltip: CustomAnnotationTooltip;
  isGrouped: boolean;
}
