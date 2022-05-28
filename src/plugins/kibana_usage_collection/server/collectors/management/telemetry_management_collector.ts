/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { UsageStats } from './types';
import { REDACTED_KEYWORD } from '../../../common/constants';
import { stackManagementSchema } from './schema';

export function createCollectorFetch(getUiSettingsClient: () => IUiSettingsClient | undefined) {
  return async function fetchUsageStats(): Promise<UsageStats | undefined> {
    const uiSettingsClient = getUiSettingsClient();
    if (!uiSettingsClient) {
      return;
    }

    const userProvided = await uiSettingsClient.getUserProvided();
    const modifiedEntries = Object.entries(userProvided)
      .filter(([key]) => key !== 'buildNum')
      .reduce((obj: Record<string, unknown>, [key, { userValue }]) => {
        const sensitive = uiSettingsClient.isSensitive(key);
        obj[key] = sensitive ? REDACTED_KEYWORD : userValue;
        return obj;
      }, {});
    // TODO: It would be Partial<UsageStats>, but the telemetry-tools for the schema extraction still does not support it. We need to fix it before setting the right Partial<UsageStats> type
    return modifiedEntries as unknown as UsageStats;
  };
}

export function registerManagementUsageCollector(
  usageCollection: UsageCollectionSetup,
  getUiSettingsClient: () => IUiSettingsClient | undefined
) {
  const collector = usageCollection.makeUsageCollector<UsageStats | undefined>({
    type: 'stack_management',
    isReady: () => typeof getUiSettingsClient() !== 'undefined',
    fetch: createCollectorFetch(getUiSettingsClient),
    schema: stackManagementSchema,
  });

  usageCollection.registerCollector(collector);
}
