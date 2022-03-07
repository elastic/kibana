/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { Range } from '../../../expressions/public';
import { ColorSchemaParams, Labels, Style } from '../../../charts/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeGaugePluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisTypeGaugePluginStart {}

/**
 * Gauge title alignment
 */
export const Alignment = {
  Automatic: 'automatic',
  Horizontal: 'horizontal',
  Vertical: 'vertical',
} as const;

export type Alignment = $Values<typeof Alignment>;

export const GaugeType = {
  Arc: 'Arc',
  Circle: 'Circle',
} as const;

export type GaugeType = $Values<typeof GaugeType>;

export interface Gauge extends ColorSchemaParams {
  backStyle: 'Full';
  gaugeStyle: 'Full';
  orientation: 'vertical';
  type: 'meter';
  alignment: Alignment;
  colorsRange: Range[];
  extendRange: boolean;
  gaugeType: GaugeType;
  labels: Labels;
  percentageMode: boolean;
  percentageFormatPattern?: string;
  outline?: boolean;
  scale: {
    show: boolean;
    labels: false;
    color: 'rgba(105,112,125,0.2)';
  };
  style: Style;
}

export interface GaugeVisParams {
  type: 'gauge';
  addTooltip: boolean;
  addLegend: boolean;
  isDisplayWarning: boolean;
  gauge: Gauge;
}

export interface GaugeTypeProps {
  showElasticChartsOptions?: boolean;
}
