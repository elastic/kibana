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
import { UsageStats } from './types';
import { REDACTED_KEYWORD } from '../../../common/constants';

export function createCollectorFetch(getUiSettingsClient: () => IUiSettingsClient | undefined) {
  return async function fetchUsageStats(): Promise<UsageStats | undefined> {
    const uiSettingsClient = getUiSettingsClient();
    if (!uiSettingsClient) {
      return;
    }

    const userProvided = await uiSettingsClient.getUserProvided();
    const modifiedEntries = Object.entries(userProvided)
      .filter(([key]) => key !== 'buildNum')
      .reduce((obj: any, [key, { userValue }]) => {
        const sensitive = uiSettingsClient.isSensitive(key);
        obj[key] = sensitive ? REDACTED_KEYWORD : userValue;
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
