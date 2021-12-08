/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ISearchStrategy, PluginStart } from '../../data/server';
import { IMyStrategyRequest, IMyStrategyResponse } from '../common/types';

export const mySearchStrategyProvider = (
  data: PluginStart
): ISearchStrategy<IMyStrategyRequest, IMyStrategyResponse> => {
  const preprocessRequest = (request: IMyStrategyRequest) => {
    // Custom preprocessing
  };

  const formatResponse = (response: IMyStrategyResponse) => {
    // Custom post-processing
  };

  const es = data.search.getSearchStrategy();
  return {
    search: (request, options, deps) => {
      return formatResponse(es.search(preprocessRequest(request), options, deps));
    },
  };
};
