/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { EsqlSource } from '@kbn/data-source';
import { registerEsqlSourceInDataViewsCache, unregisterFromDataViewsCache } from '@kbn/data-source';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DiscoverServices } from '../../../build_services';
import { createEsqlSource } from './create_esql_source';

/**
 * Resolves an `EsqlSource` (time field + LIMIT 0 schema via `EsqlSource.create`)
 * and registers it with `DataSourceService` and the DataViews cache shim.
 *
 * Call this whenever the ES|QL query identity changes — tab init or app-state
 * subscribe — then let fetch read `currentDataSource$`.
 */
export async function resolveEsqlSource({
  esql,
  services,
  esqlVariables,
  timeRange,
  previousSourceId,
}: {
  esql: string;
  services: DiscoverServices;
  esqlVariables?: ESQLControlVariable[];
  timeRange?: { from: string; to: string };
  previousSourceId?: string;
}): Promise<{ esqlSource: EsqlSource; dataView: DataView }> {
  const esqlSource = await createEsqlSource({
    esql,
    http: services.http,
    projectRoutingFallback: services.cps?.cpsManager?.getProjectRouting(),
    timeRange: timeRange ?? services.data.query.timefilter.timefilter.getTime(),
    esqlVariables,
  });

  if (previousSourceId && previousSourceId !== esqlSource.id) {
    services.dataSourceService.unregisterEsqlSource(previousSourceId);
    unregisterFromDataViewsCache(services.dataViews, previousSourceId);
  }

  services.dataSourceService.registerEsqlSource(esqlSource);
  const dataView = await registerEsqlSourceInDataViewsCache(services.dataViews, esqlSource);

  return { esqlSource, dataView };
}
