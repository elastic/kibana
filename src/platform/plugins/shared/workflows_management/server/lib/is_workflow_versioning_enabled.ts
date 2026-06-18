/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/server';
import { WORKFLOWS_VERSIONING_SETTING_ID } from '@kbn/workflows/common/constants';

// Global gate; Advanced Settings marks this as requiresPageReload, but cache briefly
// so hot mutation paths do not re-read saved objects on every write.
const WORKFLOW_VERSIONING_ENABLED_CACHE_TTL_MS = 60_000;

interface VersioningEnabledCache {
  value: boolean;
  expiresAt: number;
}

let versioningEnabledCache: VersioningEnabledCache | undefined;
let versioningEnabledReadPromise: Promise<boolean> | undefined;

const readWorkflowVersioningEnabled = async (coreStart: CoreStart): Promise<boolean> => {
  const savedObjectsClient = coreStart.savedObjects.createInternalRepository();
  const uiSettingsClient = coreStart.uiSettings.globalAsScopedToClient(savedObjectsClient);
  return uiSettingsClient.get<boolean>(WORKFLOWS_VERSIONING_SETTING_ID);
};

export const isWorkflowVersioningEnabled = async (coreStart: CoreStart): Promise<boolean> => {
  const now = Date.now();
  const cached = versioningEnabledCache;
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (!versioningEnabledReadPromise) {
    versioningEnabledReadPromise = readWorkflowVersioningEnabled(coreStart)
      .then((value) => {
        versioningEnabledCache = {
          value,
          expiresAt: Date.now() + WORKFLOW_VERSIONING_ENABLED_CACHE_TTL_MS,
        };
        return value;
      })
      .finally(() => {
        versioningEnabledReadPromise = undefined;
      });
  }

  return versioningEnabledReadPromise;
};

/** @internal */
export const resetWorkflowVersioningEnabledCache = (): void => {
  versioningEnabledCache = undefined;
  versioningEnabledReadPromise = undefined;
};
