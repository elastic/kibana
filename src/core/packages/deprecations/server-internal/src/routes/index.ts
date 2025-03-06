/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import { Logger } from '@kbn/logging';
import type { InternalDeprecationRequestHandlerContext } from '../internal_types';
import { registerGetRoute } from './get';
import { registerMarkAsResolvedRoute } from './resolve_deprecated_api';
import { registerApiDeprecationsPostValidationHandler } from './post_validation_handler';

export function registerRoutes({
  http,
  coreUsageData,
  logger,
}: {
  http: InternalHttpServiceSetup;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
}) {
  const router = http.createRouter<InternalDeprecationRequestHandlerContext>('/api/deprecations');
  registerGetRoute(router);

  registerApiDeprecationsPostValidationHandler({ http, coreUsageData, logger });
  registerMarkAsResolvedRoute(router, { coreUsageData });
}
