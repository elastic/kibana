/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import { Query } from '../../..';
import { QueryStringContract } from '../../../query/query_string';

interface UseQueryStringProps {
  query?: Query;
  queryStringManager: QueryStringContract;
}

export const useQueryStringManager = (props: UseQueryStringProps) => {
  // Filters should be either what's passed in the initial state or the current state of the filter manager
  const [query, setQuery] = useState<Query>(props.query || props.queryStringManager.getQuery());
  useEffect(() => {
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
  }, [props.queryStringManager]);

  return { query };
};
