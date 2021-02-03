/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { map } from 'rxjs/operators';
import { ISearchStrategy, PluginStart } from '../../../src/plugins/data/server';
import { IMyStrategyResponse, IMyStrategyRequest } from '../common';

export const mySearchStrategyProvider = (
  data: PluginStart
): ISearchStrategy<IMyStrategyRequest, IMyStrategyResponse> => {
  const es = data.search.getSearchStrategy();
  return {
    search: (request, options, deps) =>
      es.search(request, options, deps).pipe(
        map((esSearchRes) => ({
          ...esSearchRes,
          cool: request.get_cool ? 'YES' : 'NOPE',
        }))
      ),
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        await es.cancel(id, options, deps);
      }
    },
  };
};
