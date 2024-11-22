/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IConfigService, Env } from '@kbn/config';
import type { LoggerFactory } from '@kbn/logging';
import type { CoreId } from '@kbn/core-base-common-internal';

/**
 * Groups all main Kibana's core modules/systems/services that are consumed in a
 * variety of places within the core itself.
 * @internal
 */
export interface CoreContext {
  coreId: CoreId;
  env: Env;
  configService: IConfigService;
  logger: LoggerFactory;
}
