/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, RequestHandlerContext, StartServicesAccessor } from '@kbn/core/server';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../../types';
import { DataViewsAsCodeService } from './data_views_as_code_service';

export async function getDataViewsAsCodeService(
  ctx: RequestHandlerContext,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  req: KibanaRequest
) {
  const core = await ctx.core;
  const savedObjectsClient = core.savedObjects.client;
  const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
  const [, , { dataViewsServiceFactory }] = await getStartServices();
  const dataViewsService = await dataViewsServiceFactory(
    savedObjectsClient,
    elasticsearchClient,
    req
  );
  return new DataViewsAsCodeService(dataViewsService);
}
