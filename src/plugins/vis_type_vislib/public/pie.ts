/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pieVisType } from '../../vis_type_pie/public';
import { VisTypeDefinition } from '../../visualizations/public';
import { CommonVislibParams } from './types';
import { toExpressionAst } from './to_ast_pie';

export interface PieVisParams extends CommonVislibParams {
  type: 'pie';
  isDonut: boolean;
  labels: {
    show: boolean;
    values: boolean;
    last_level: boolean;
    truncate: number | null;
  };
}

export const pieVisTypeDefinition = {
  ...pieVisType({}),
  toExpressionAst,
} as VisTypeDefinition<PieVisParams>;
