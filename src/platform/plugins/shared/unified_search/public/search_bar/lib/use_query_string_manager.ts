/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useMemo } from 'react';
import { Subscription } from 'rxjs';
import type { Query, AggregateQuery } from '@kbn/es-query';
import type { QueryStringContract } from '@kbn/data-plugin/public';

function isOfQueryType(arg: Query | AggregateQuery): arg is Query {
  return Boolean(arg && 'query' in arg);
}

interface UseQueryStringProps {
  disabled?: boolean;
  query?: Query | AggregateQuery;
  queryStringManager: QueryStringContract;
}

export const useQueryStringManager = (props: UseQueryStringProps) => {
  // Filters should be either what's passed in the initial state or the current state of the filter manager
  const [query, setQuery] = useState<Query | AggregateQuery>(
    props.query || props.queryStringManager.getQuery()
  );
  useEffect(() => {
    if (props.disabled) {
      return;
    }

    const subscriptions = new Subscription();

    subscriptions.add(
      props.queryStringManager.getUpdates$().subscribe({
        next: () => {
          const newQuery = props.queryStringManager.getQuery();
          setQuery(newQuery);
        },
      })
    );

    return () => {
      subscriptions.unsubscribe();
    };
  }, [props.queryStringManager, props.disabled]);

  const stableQuery = useMemo(() => getStableQuery(query), [query]);

  const propsQuery = useMemo(
    () => getStableQuery(props.query || props.queryStringManager.getDefaultQuery()),
    [props.query, props.queryStringManager]
  );

  return { query: props.disabled ? propsQuery : stableQuery };
};

function getStableQuery(query: Query | AggregateQuery) {
  if (isOfQueryType(query)) {
    return {
      language: query.language,
      query: query.query,
    };
  }
  return query;
}
