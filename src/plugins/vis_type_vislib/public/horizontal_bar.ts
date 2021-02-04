/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { xyVisTypes } from '../../vis_type_xy/public';
import { VisTypeDefinition } from '../../visualizations/public';

import { toExpressionAst } from './to_ast';
import { BasicVislibParams } from './types';

export const horizontalBarVisTypeDefinition = {
  ...xyVisTypes.horizontalBar(),
  toExpressionAst,
} as VisTypeDefinition<BasicVislibParams>;
