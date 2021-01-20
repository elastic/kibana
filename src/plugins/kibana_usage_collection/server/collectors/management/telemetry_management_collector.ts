/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { stackManagementSchema } from './schema';

export interface UsageStats extends Record<string, boolean | number | string> {
  // We don't support `type` yet. Only interfaces. So I added at least 1 known key to the generic
  // Record extension to avoid eslint reverting it back to a `type`
  'visualize:enableLabs': boolean;
}

export function createCollectorFetch(getUiSettingsClient: () => IUiSettingsClient | undefined) {
  return async function fetchUsageStats(): Promise<UsageStats | undefined> {
    const uiSettingsClient = getUiSettingsClient();
    if (!uiSettingsClient) {
      return;
    }

    const user = await uiSettingsClient.getUserProvided();
    const modifiedEntries = Object.keys(user)
      .filter((key: string) => key !== 'buildNum')
      .reduce((obj: any, key: string) => {
        obj[key] = user[key].userValue;
        return obj;
      }, {});

    return modifiedEntries;
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
