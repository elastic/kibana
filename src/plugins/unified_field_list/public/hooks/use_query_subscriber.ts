/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';

/**
 * Hook params
 */
export interface QuerySubscriberParams {
  data: DataPublicPluginStart;
}

/**
 * Result from the hook
 */
export interface QuerySubscriberResult {
  query: Query | AggregateQuery | undefined;
  filters: Filter[] | undefined;
}

/**
 * Memorizes current query and filters
 * @param data
 */
export const useQuerySubscriber = ({ data }: QuerySubscriberParams) => {
  const [result, setResult] = useState<QuerySubscriberResult>(() => {
    const state = data.query.getState();
    return {
      query: state?.query,
      filters: state?.filters,
    };
  });

  useEffect(() => {
    const subscription = data.query.state$.subscribe(({ state }) => {
      setResult((prevState) => ({
        ...prevState,
        query: state.query,
        filters: state.filters,
      }));
    });

    return () => subscription.unsubscribe();
  }, [setResult, data.query.state$]);

  return result;
};
