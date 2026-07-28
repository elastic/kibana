/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  KibanaRequest,
  RequestHandler,
  RequestHandlerContext,
  RouteMethod,
  StartServicesAccessor,
} from '@kbn/core/server';
import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import { logRequest, writeErrorHandler } from '@kbn/as-code-utils';
import { ValidationError } from '@kbn/config-schema';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { DuplicateDataViewError } from '@kbn/data-views-plugin/common';
import type { DataViewsAsCodeServerPluginStartDependencies } from '../types';
import { DataViewsAsCodeService } from '../services/data_views_as_code_service';
import type { RegisterRouteArgs } from './types';

export async function getDataViewsAsCodeService(
  ctx: RequestHandlerContext,
  getStartServices: StartServicesAccessor<DataViewsAsCodeServerPluginStartDependencies, void>,
  req: KibanaRequest
) {
  const core = await ctx.core;
  const savedObjectsClient = core.savedObjects.client;
  const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
  const [, { dataViews }] = await getStartServices();
  const dataViewsService = await dataViews.dataViewsServiceFactory(
    savedObjectsClient,
    elasticsearchClient,
    req
  );
  return new DataViewsAsCodeService(dataViewsService, core.savedObjects.getClient());
}

/**
 * This higher order request handler makes sure that requests to the data views as code
 * endpoints go through the telemetry and in case of erroring are handled correctly.
 */
export const requestHandler =
  <P, Q, B, Context extends RequestHandlerContext, Method extends RouteMethod>(
    args: Pick<RegisterRouteArgs, 'logger' | 'usageCounter'>,
    handler: RequestHandler<P, Q, B, Context, Method>
  ): RequestHandler<P, Q, B, Context, Method> =>
  async (context, request, response) =>
    telemetryHandler(request, { usageCounter: args.usageCounter }, async () => {
      try {
        return await handler(context, request, response);
      } catch (error: any) {
        const isNotFound =
          (error.isBoom && error.output.statusCode === 404) || error instanceof SavedObjectNotFound;
        if (isNotFound) {
          logRequest(args.logger, request, 'debug', error.message);
          return response.notFound({ body: { message: error.message } });
        }

        const isConflict =
          (error.isBoom && error.output.statusCode === 409) ||
          error instanceof DuplicateDataViewError;
        if (isConflict) {
          logRequest(args.logger, request, 'debug', error.message);
          return response.conflict({ body: { message: error.message } });
        }

        if (error instanceof ValidationError) {
          logRequest(args.logger, request, 'warn', error.message);
          throw error;
        }

        return writeErrorHandler(error, response, args.logger, request);
      }
    });
