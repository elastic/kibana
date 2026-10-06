/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { Storage } from '@kbn/analytics';
import type { Reporter } from '@kbn/analytics';
import type { HttpSetup } from '@kbn/core/public';
interface AnalyticsReporterConfig {
  localStorage: Storage;
  logger: Logger;
  fetch: HttpSetup;
}
export declare function createReporter(config: AnalyticsReporterConfig): Reporter;
export {};
