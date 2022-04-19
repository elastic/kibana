/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import { DataPublicPluginStart, Filter } from '@kbn/data-plugin/public';

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
