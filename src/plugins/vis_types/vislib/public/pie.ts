/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pieVisType } from '../../pie/public';
import { VisTypeDefinition } from '../../../visualizations/public';
import { CommonVislibParams } from './types';
import { toExpressionAst } from './to_ast_pie';

export enum LegendDisplay {
  SHOW = 'show',
  HIDE = 'hide',
  DEFAULT = 'default',
}

export type PieVisParams = Omit<CommonVislibParams, 'addLegend'> & {
  type: 'pie';
  isDonut: boolean;
  labels: {
    show: boolean;
    values: boolean;
    last_level: boolean;
    truncate: number | null;
  };
  legendDisplay: LegendDisplay;
};

export const pieVisTypeDefinition = {
  ...pieVisType({}),
  toExpressionAst,
} as VisTypeDefinition<PieVisParams>;
