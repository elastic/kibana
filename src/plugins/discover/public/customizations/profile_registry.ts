/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AppDeepLink, AppUpdater } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { sortBy } from 'lodash';
import { map, Observable, BehaviorSubject } from 'rxjs';
import { DISCOVER_DEFAULT_PROFILE_ID } from '../../common/customizations';
import type { CustomizationCallback } from './types';

export type DiscoverProfileId = string;

export interface DiscoverProfile {
  id: DiscoverProfileId;
  displayName: string;
  customizationCallbacks: CustomizationCallback[];
  deepLinks: AppDeepLink[];
}

export type DiscoverProfileOptions = Pick<DiscoverProfile, 'id' | 'displayName'> &
  Partial<DiscoverProfile>;

export type RegisterDiscoverProfile = (options: DiscoverProfileOptions) => void;

export interface DiscoverProfileRegistry {
  get(id: DiscoverProfileId): DiscoverProfile | undefined;
  getAll(): DiscoverProfile[];
  set: RegisterDiscoverProfile;
  getContributedAppState$: () => Observable<AppUpdater>;
}

export const createProfileRegistry = (): DiscoverProfileRegistry => {
  const profiles = new Map<string, DiscoverProfile>([[defaultProfile.id, defaultProfile]]);
  const profiles$ = new BehaviorSubject([...profiles.values()]);

  return {
    get: (id) => profiles.get(id.toLowerCase()),
    getAll: () => sortBy(profiles$.getValue(), 'displayName'),
    set: (options) => {
      profiles.set(options.id.toLowerCase(), createProfile(options));
      profiles$.next([...profiles.values()]);
    },
    getContributedAppState$() {
      return profiles$.pipe(
        map((profilesList) => profilesList.flatMap((profile) => profile.deepLinks)),
        map(
          (profilesDeepLinks): AppUpdater =>
            (app) => ({
              deepLinks: getUniqueDeepLinks([...(app.deepLinks ?? []), ...profilesDeepLinks]),
            })
        )
      );
    },
  };
};

/**
 * Utils
 */

export const createProfile = (options: DiscoverProfileOptions): DiscoverProfile => ({
  customizationCallbacks: [],
  deepLinks: [],
  ...options,
});

const defaultProfileName = i18n.translate('discover.profiles.defaultProfileName', {
  defaultMessage: 'Discover',
});

const defaultProfile = createProfile({
  id: DISCOVER_DEFAULT_PROFILE_ID,
  displayName: defaultProfileName,
});

const getUniqueDeepLinks = (deepLinks: AppDeepLink[]): AppDeepLink[] => {
  const mapValues = deepLinks
    .reduce((deepLinksMap, deepLink) => deepLinksMap.set(deepLink.id, deepLink), new Map())
    .values();

  return Array.from(mapValues);
};
