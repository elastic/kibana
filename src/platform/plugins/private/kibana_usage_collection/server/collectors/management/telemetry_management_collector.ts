/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import type { UsageStats } from './types';
import { REDACTED_KEYWORD } from '../../../common/constants';
import { stackManagementSchema } from './schema';

/**
 * These config keys should be redacted from any usage data, they are only used for implementation details of the config saved object.
 */
const CONFIG_KEYS_TO_REDACT = ['buildNum', 'isDefaultIndexMigrated'];

/**
 * Settings stored at the global scope, shared by all spaces. Their values are read from the global client.
 */
const GLOBAL_SETTINGS_TO_REPORT: string[] = [GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING];

export function createCollectorFetch(
  getUiSettingsClient: () => IUiSettingsClient | undefined,
  getGlobalUiSettingsClient: () => IUiSettingsClient | undefined = () => undefined
) {
  return async function fetchUsageStats(): Promise<UsageStats | undefined> {
    const uiSettingsClient = getUiSettingsClient();
    if (!uiSettingsClient) {
      return;
    }
    const globalUiSettingsClient = getGlobalUiSettingsClient();

    const userProvided = await uiSettingsClient.getUserProvided();
    const globalUserProvided = (await globalUiSettingsClient?.getUserProvided()) ?? {};

    const spaceEntries = Object.entries(userProvided)
      .filter(([key]) => !GLOBAL_SETTINGS_TO_REPORT.includes(key))
      .map(([key, { userValue }]) => ({
        key,
        userValue,
        sensitive: uiSettingsClient.isSensitive(key),
      }));
    const globalEntries = GLOBAL_SETTINGS_TO_REPORT.filter((key) => key in globalUserProvided).map(
      (key) => ({
        key,
        userValue: globalUserProvided[key].userValue,
        sensitive: globalUiSettingsClient?.isSensitive(key) ?? false,
      })
    );

    const modifiedEntries = [...spaceEntries, ...globalEntries]
      .filter(({ key }) => !CONFIG_KEYS_TO_REDACT.includes(key))
      .reduce((obj: Record<string, unknown>, { key, userValue, sensitive }) => {
        obj[key] = sensitive ? REDACTED_KEYWORD : userValue;
        return obj;
      }, {});
    // TODO: It would be Partial<UsageStats>, but the telemetry-tools for the schema extraction still does not support it. We need to fix it before setting the right Partial<UsageStats> type
    return modifiedEntries as unknown as UsageStats;
  };
}

export function registerManagementUsageCollector(
  usageCollection: UsageCollectionSetup,
  getUiSettingsClient: () => IUiSettingsClient | undefined,
  getGlobalUiSettingsClient: () => IUiSettingsClient | undefined
) {
  const collector = usageCollection.makeUsageCollector<UsageStats | undefined>({
    type: 'stack_management',
    isReady: () => typeof getUiSettingsClient() !== 'undefined',
    fetch: createCollectorFetch(getUiSettingsClient, getGlobalUiSettingsClient),
    schema: stackManagementSchema,
  });

  usageCollection.registerCollector(collector);
}
