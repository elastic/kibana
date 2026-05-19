/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { ApplicationUsageReport } from './schema';
export declare const storeApplicationUsage: (
  repository: ISavedObjectsRepository,
  appUsages: ApplicationUsageReport[],
  timestamp: Date
) => Promise<
  | PromiseSettledResult<
      import('@kbn/core/packages/saved-objects/common').SavedObject<{
        appId: string;
        viewId: string;
        timestamp: string;
      }>
    >[]
  | undefined
>;
