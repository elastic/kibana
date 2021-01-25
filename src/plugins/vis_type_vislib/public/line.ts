/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { xyVisTypes } from '../../vis_type_xy/public';
import { BaseVisTypeOptions } from '../../visualizations/public';

import { toExpressionAst } from './to_ast';
import { BasicVislibParams } from './types';

export const lineVisTypeDefinition: BaseVisTypeOptions<BasicVislibParams> = {
  ...(xyVisTypes.line() as BaseVisTypeOptions<BasicVislibParams>),
  toExpressionAst,
  visualization: undefined,
};
