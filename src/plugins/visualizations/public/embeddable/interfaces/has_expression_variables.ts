/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type HasType, apiIsOfType } from '@kbn/presentation-publishing';
import { Observable } from 'rxjs';

type ExpressionVariables = Record<string, unknown> | undefined;

export type HasExpressionVariables = HasType<'visualization'> & {
  getExpressionVariables: () => ExpressionVariables;
  getExpressionVariables$: () => Observable<ExpressionVariables>;
};

export const apiHasExpressionVariables = (api: unknown): api is HasExpressionVariables => {
  const maybeHasExpressionVariables = api as HasExpressionVariables;
  return Boolean(
    api &&
      apiIsOfType(api, 'visualization') &&
      maybeHasExpressionVariables.getExpressionVariables &&
      typeof maybeHasExpressionVariables.getExpressionVariables === 'function' &&
      maybeHasExpressionVariables.getExpressionVariables$ &&
      typeof maybeHasExpressionVariables.getExpressionVariables$ === 'function'
  );
};
