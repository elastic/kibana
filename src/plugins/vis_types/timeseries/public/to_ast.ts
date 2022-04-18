/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import type { Vis } from '@kbn/visualizations-plugin/public';
import type { TimeseriesExpressionFunctionDefinition } from './metrics_fn';
import type { TimeseriesVisParams } from './types';

export const toExpressionAst = (vis: Vis<TimeseriesVisParams>) => {
  const timeseries = buildExpressionFunction<TimeseriesExpressionFunctionDefinition>('tsvb', {
    params: JSON.stringify(vis.params),
    uiState: JSON.stringify(vis.uiState),
  });

  const ast = buildExpression([timeseries]);

  return ast.toAst();
};
