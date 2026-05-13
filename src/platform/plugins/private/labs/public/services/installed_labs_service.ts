/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, firstValueFrom, take, type Observable } from 'rxjs';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import {
  LABS_STORAGE_KEY,
  LABS_USER_SETTINGS_DATA_PATH,
  LABS_USER_SETTINGS_INSTALLED_FIELD,
  type LabId,
  type LabsProfileData,
} from '../../common';

interface StoredInstalledLabs {
  installedLabIds?: string[];
  version: 1;
}

interface InstalledLabsServiceParams {
  allowedLabIds: readonly LabId[];
  userProfile: UserProfileServiceStart;
}

export interface InstalledLabsService {
  getInstalledLabIds: () => readonly LabId[];
  getInstalledLabIds$: () => Observable<readonly LabId[]>;
  isInstalled: (labId: LabId) => Promise<boolean>;
  load: () => Promise<readonly LabId[]>;
  setInstalled: (labId: LabId, isInstalled: boolean) => Promise<readonly LabId[]>;
}

export const createInstalledLabsService = ({
  allowedLabIds,
  userProfile,
}: InstalledLabsServiceParams): InstalledLabsService => {
  const allowedLabIdsSet = new Set<string>(allowedLabIds);
  const installedLabIds$ = new BehaviorSubject<readonly LabId[]>([]);
  let hasLoaded = false;
  let loadPromise: Promise<readonly LabId[]> | undefined;

  const getInstalledLabIds = () => installedLabIds$.getValue();

  const getInstalledLabIds$ = () => installedLabIds$.asObservable();

  const load = async (): Promise<readonly LabId[]> => {
    if (loadPromise) {
      return loadPromise;
    }

    loadPromise = readInstalledLabIds(userProfile, allowedLabIdsSet)
      .then((installedLabIds) => {
        hasLoaded = true;
        installedLabIds$.next(installedLabIds);
        return installedLabIds;
      })
      .finally(() => {
        loadPromise = undefined;
      });

    return loadPromise;
  };

  const isInstalled = async (labId: LabId) => {
    const installedLabIds = hasLoaded ? getInstalledLabIds() : await load();
    return installedLabIds.includes(labId);
  };

  const setInstalled = async (labId: LabId, isInstalledValue: boolean) => {
    const currentInstalledLabIds = hasLoaded ? getInstalledLabIds() : await load();
    const nextInstalledLabIds = toNextInstalledLabIds(
      currentInstalledLabIds,
      labId,
      isInstalledValue
    );

    await writeInstalledLabIds(userProfile, nextInstalledLabIds);

    hasLoaded = true;
    installedLabIds$.next(nextInstalledLabIds);

    return nextInstalledLabIds;
  };

  return {
    getInstalledLabIds,
    getInstalledLabIds$,
    isInstalled,
    load,
    setInstalled,
  };
};

const toNextInstalledLabIds = (
  installedLabIds: readonly LabId[],
  labId: LabId,
  isInstalled: boolean
): readonly LabId[] => {
  const installedLabIdsSet = new Set(installedLabIds);

  if (isInstalled) {
    installedLabIdsSet.add(labId);
  } else {
    installedLabIdsSet.delete(labId);
  }

  return Array.from(installedLabIdsSet).toSorted();
};

const readInstalledLabIds = async (
  userProfile: UserProfileServiceStart,
  allowedLabIds: ReadonlySet<string>
): Promise<readonly LabId[]> => {
  try {
    const enabled = await firstValueFrom(userProfile.getEnabled$().pipe(take(1)));

    if (enabled) {
      try {
        const profile = await userProfile.getCurrent<LabsProfileData>({
          dataPath: LABS_USER_SETTINGS_DATA_PATH,
        });
        const installedLabIds = parseInstalledLabIds(
          profile?.data?.userSettings?.labsInstalledLabIdsJson,
          allowedLabIds
        );

        if (installedLabIds.length > 0) {
          return installedLabIds;
        }

        const storageInstalledLabIds = readInstalledLabIdsFromStorage(allowedLabIds);

        if (storageInstalledLabIds.length > 0) {
          await writeInstalledLabIds(userProfile, storageInstalledLabIds);
          return storageInstalledLabIds;
        }

        return [];
      } catch {
        return readInstalledLabIdsFromStorage(allowedLabIds);
      }
    }
  } catch {
    return readInstalledLabIdsFromStorage(allowedLabIds);
  }

  return readInstalledLabIdsFromStorage(allowedLabIds);
};

const writeInstalledLabIds = async (
  userProfile: UserProfileServiceStart,
  installedLabIds: readonly LabId[]
): Promise<void> => {
  try {
    const enabled = await firstValueFrom(userProfile.getEnabled$().pipe(take(1)));

    if (enabled) {
      try {
        await userProfile.partialUpdate({
          userSettings: {
            [LABS_USER_SETTINGS_INSTALLED_FIELD]: JSON.stringify(installedLabIds),
          },
        });
        removeInstalledLabIdsFromStorage();
        return;
      } catch {
        writeInstalledLabIdsToStorage(installedLabIds);
        return;
      }
    }
  } catch {
    writeInstalledLabIdsToStorage(installedLabIds);
    return;
  }

  writeInstalledLabIdsToStorage(installedLabIds);
};

const readInstalledLabIdsFromStorage = (allowedLabIds: ReadonlySet<string>): readonly LabId[] => {
  try {
    const value = localStorage.getItem(LABS_STORAGE_KEY);

    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value) as StoredInstalledLabs | readonly string[] | null;
    const installedLabIds = Array.isArray(parsed)
      ? parsed
      : isStoredInstalledLabs(parsed)
      ? parsed.installedLabIds ?? []
      : [];

    return sanitizeInstalledLabIds(installedLabIds, allowedLabIds);
  } catch {
    return [];
  }
};

const isStoredInstalledLabs = (value: unknown): value is StoredInstalledLabs => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const writeInstalledLabIdsToStorage = (installedLabIds: readonly LabId[]) => {
  try {
    const value: StoredInstalledLabs = {
      installedLabIds: [...installedLabIds],
      version: 1,
    };
    localStorage.setItem(LABS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage write failures and keep the in-memory state for this page load.
  }
};

const removeInstalledLabIdsFromStorage = () => {
  try {
    localStorage.removeItem(LABS_STORAGE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
};

const sanitizeInstalledLabIds = (
  installedLabIds: readonly string[] | undefined,
  allowedLabIds: ReadonlySet<string>
): readonly LabId[] => {
  if (!installedLabIds?.length) {
    return [];
  }

  return installedLabIds.filter((labId): labId is LabId => allowedLabIds.has(labId)).toSorted();
};

const parseInstalledLabIds = (
  value: string | undefined,
  allowedLabIds: ReadonlySet<string>
): readonly LabId[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? sanitizeInstalledLabIds(parsed, allowedLabIds) : [];
  } catch {
    return [];
  }
};
