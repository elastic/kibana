/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { DiscoverAppLocatorParams } from '../locator';
import { useDiscoverServices } from './use_discover_services';

export const useRootBreadcrumb = ({
  dataViewId,
  filters,
  columns,
  query,
  timeRange,
}: {
  dataViewId: string;
  filters?: Filter[];
  columns?: string[];
  query?: Query | AggregateQuery;
  timeRange?: TimeRange;
}) => {
  const services = useDiscoverServices();
  const [breadcrumb, setBreadcrumb] = useState<string>();

  useEffect(() => {
    const getHref = async () => {
      const state: DiscoverAppLocatorParams = {
        dataViewId,
        filters,
        columns,
        timeRange,
        query,
      };

      const href = await services.locator.getUrl(state);
      setBreadcrumb(href);
    };
    getHref();
  }, [columns, dataViewId, filters, query, services.locator, timeRange]);

  return breadcrumb;
};
