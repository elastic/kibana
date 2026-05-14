/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  RequestHandlerContext,
  UserProfileLabels,
  UserProfileRequestHandlerContext,
} from '@kbn/core/server';
import { LABS_USER_SETTINGS_DATA_PATH, type LabId, type LabsProfileData } from '../../common';

interface LabsRequestHandlerContext extends RequestHandlerContext {
  userProfile?: UserProfileRequestHandlerContext;
}

export const getInstalledLabIds = async (
  context: LabsRequestHandlerContext
): Promise<ReadonlySet<string> | undefined> => {
  if (!context.userProfile) {
    return undefined;
  }

  try {
    const profile = await context.userProfile.getCurrent<LabsProfileData, UserProfileLabels>({
      dataPath: LABS_USER_SETTINGS_DATA_PATH,
    });
    const installedLabIds = parseInstalledLabIds(
      profile?.data?.userSettings?.labsInstalledLabIdsJson
    );
    return new Set(installedLabIds);
  } catch {
    return undefined;
  }
};

export const isLabInstalled = async (
  context: LabsRequestHandlerContext,
  labId: LabId
): Promise<boolean> => {
  const installedLabIds = await getInstalledLabIds(context);

  // When user profiles are unavailable, the browser falls back to localStorage.
  // In that mode the server cannot reliably enforce per-user install state.
  if (!installedLabIds) {
    return true;
  }

  return installedLabIds.has(labId);
};

const parseInstalledLabIds = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : [];
  } catch {
    return [];
  }
};
