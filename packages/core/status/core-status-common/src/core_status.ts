/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceStatus } from './service_status';

/**
 * Status of core services.
 *
 * @internalRemarks
 * Only contains entries for backend services that could have a non-available `status`.
 * For example, `context` cannot possibly be broken, so it is not included.
 *
 * @public
 */
export interface CoreStatus {
  elasticsearch: ServiceStatus;
  savedObjects: ServiceStatus;
}
