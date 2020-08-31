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
import { DataPublicPluginStart, Filter } from '../../..';

interface UseFilterManagerProps {
  filters?: Filter[];
  filterManager: DataPublicPluginStart['query']['filterManager'];
}

export const useFilterManager = (props: UseFilterManagerProps) => {
  // Filters should be either what's passed in the initial state or the current state of the filter manager
  const [filters, setFilters] = useState(props.filters || props.filterManager.getFilters());
  useEffect(() => {
    const subscriptions = new Subscription();

    subscriptions.add(
      props.filterManager.getUpdates$().subscribe({
        next: () => {
          const newFilters = props.filterManager.getFilters();
          setFilters(newFilters);
        },
      })
    );

    return () => {
      subscriptions.unsubscribe();
    };
  }, [props.filterManager]);

  return { filters };
};
