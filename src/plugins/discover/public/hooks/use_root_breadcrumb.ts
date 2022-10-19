/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from './use_discover_services';

/**
 * Params used to create discover main view breadcrumb link if any provided
 */
export interface DiscoverMainStateParams {
  index: string | DataViewSpec;
  columns?: string[];
  filters?: Filter[];
  timeRange?: TimeRange;
  query?: Query | AggregateQuery;
  savedSearchId?: string;
}

type UseRootBreadcrumbProps = Omit<DiscoverMainStateParams, 'index'> & { dataViewId: string };

/**
 * This hook returns the root breadcrumb for main Discover view,
 * it uses in context and single doc pages.
 */
export const useRootBreadcrumb = ({ dataViewId, ...params }: UseRootBreadcrumbProps) => {
  const services = useDiscoverServices();
  const [breadcrumb, setBreadcrumb] = useState<string>();

  useEffect(() => {
    services.locator.getUrl({ dataViewId, ...params }).then(setBreadcrumb);
  }, [dataViewId, params, services.locator]);

  return breadcrumb;
};
