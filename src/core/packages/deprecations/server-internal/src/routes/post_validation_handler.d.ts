/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-server-internal';
import { type CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { PostValidationMetadata } from '@kbn/core-http-server';
import type { Logger } from '@kbn/logging';
interface Dependencies {
  coreUsageData: InternalCoreUsageDataSetup;
  http: InternalHttpServiceSetup;
  logger: Logger;
}
/**
 * listens to http post validation events to increment deprecated api calls
 * This will keep track of any called deprecated API.
 */
export declare const registerApiDeprecationsPostValidationHandler: ({
  coreUsageData,
  http,
  logger,
}: Dependencies) => void;
export declare function createRouteDeprecationsHandler({
  coreUsageData,
  logger,
}: {
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
}): (req: CoreKibanaRequest, metadata: PostValidationMetadata) => void;
export {};
