/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-server-internal';
import { ensureRawRequest, type CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { PostValidationMetadata } from '@kbn/core-http-server';
import { Logger } from '@kbn/logging';
import { getEcsResponseLog } from '@kbn/core-http-server-internal/src/logging';
import { buildApiDeprecationId } from '../deprecations';
import { getIsRouteApiDeprecation, getIsAccessApiDeprecation } from '../deprecations';

interface Dependencies {
  coreUsageData: InternalCoreUsageDataSetup;
  http: InternalHttpServiceSetup;
  logger: Logger;
}

/**
 * listens to http post validation events to increment deprecated api calls
 * This will keep track of any called deprecated API.
 */
export const registerApiDeprecationsPostValidationHandler = ({
  coreUsageData,
  http,
  logger,
}: Dependencies) => {
  http.registerOnPostValidation(createRouteDeprecationsHandler({ coreUsageData, logger }));
};

export function createRouteDeprecationsHandler({
  coreUsageData,
  logger,
}: {
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
}) {
  return (req: CoreKibanaRequest, metadata: PostValidationMetadata) => {
    const hasRouteDeprecation = getIsRouteApiDeprecation(metadata);
    const hasAccessDeprecation = getIsAccessApiDeprecation(metadata);
    const isApiDeprecation = hasAccessDeprecation || hasRouteDeprecation;
    if (isApiDeprecation && req.route.routePath) {
      const counterName = buildApiDeprecationId({
        routeMethod: req.route.method,
        routePath: req.route.routePath,
        routeVersion: req.apiVersion,
      });

      const client = coreUsageData.getClient();
      // no await we just fire it off.
      void client.incrementDeprecatedApi(counterName, { resolved: false });

      if (logger.isLevelEnabled('debug')) {
        const { message, meta } = getEcsResponseLog(ensureRawRequest(req), logger);
        logger.debug(message, meta);
      }
    }
  };
}
