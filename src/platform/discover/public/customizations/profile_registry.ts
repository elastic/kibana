/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AppDeepLink, AppUpdater } from '@kbn/core/public';
import { map, Observable, BehaviorSubject } from 'rxjs';
import type { RegisterCustomizationProfile, DiscoverProfile, DiscoverProfileId } from './types';

export interface DiscoverProfileRegistry {
  get(id: DiscoverProfileId): DiscoverProfile | undefined;
  set(profile: DiscoverProfile): void;
  getContributedAppState$: () => Observable<AppUpdater>;
}

export const createProfileRegistry = (): DiscoverProfileRegistry => {
  const profiles = new Map<string, DiscoverProfile>([['default', createProfile('default')]]);
  const profiles$ = new BehaviorSubject<DiscoverProfile[]>([...profiles.values()]);

  return {
    get: (id) => profiles.get(id.toLowerCase()),
    set: (profile) => {
      profiles.set(profile.id.toLowerCase(), profile);
      profiles$.next([...profiles.values()]);
    },
    getContributedAppState$() {
      return profiles$.pipe(
        map((profilesList) => profilesList.flatMap((profile) => profile.deepLinks ?? [])),
        map((profilesDeepLinks) => (app) => ({
          deepLinks: getUniqueDeepLinks([...(app.deepLinks ?? []), ...profilesDeepLinks]),
        }))
      );
    },
  };
};

export const createRegisterCustomizationProfile =
  (profileRegistry: DiscoverProfileRegistry): RegisterCustomizationProfile =>
  (id, options) => {
    const profile = profileRegistry.get(id) ?? createProfile(id);

    const { customize, deepLinks } = options;

    profile.customizationCallbacks.push(customize);

    if (Array.isArray(deepLinks) && profile.deepLinks) {
      profile.deepLinks = getUniqueDeepLinks([...profile.deepLinks, ...deepLinks]);
    } else if (Array.isArray(deepLinks)) {
      profile.deepLinks = getUniqueDeepLinks(deepLinks);
    }

    profileRegistry.set(profile);
  };

/**
 * Utils
 */
const createProfile = (id: DiscoverProfileId): DiscoverProfile => ({
  id,
  customizationCallbacks: [],
  deepLinks: [],
});

const getUniqueDeepLinks = (deepLinks: AppDeepLink[]): AppDeepLink[] => {
  const mapValues = deepLinks
    .reduce((deepLinksMap, deepLink) => deepLinksMap.set(deepLink.id, deepLink), new Map())
    .values();

  return Array.from(mapValues);
};
