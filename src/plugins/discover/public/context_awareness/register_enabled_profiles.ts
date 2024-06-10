/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { BaseProfileProvider, BaseProfileService } from './profile_service';

export const registerEnabledProfiles = <
  TProvider extends BaseProfileProvider<{}>,
  TService extends BaseProfileService<TProvider, {}>
>({
  profileService,
  availableProviders,
  enabledProfileIds,
}: {
  profileService: TService;
  availableProviders: TProvider[];
  enabledProfileIds: string[];
}) => {
  for (const profile of availableProviders) {
    if (enabledProfileIds.includes(profile.profileId)) {
      profileService.registerProvider(profile);
    }
  }
};
