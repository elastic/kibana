/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback } from 'react';
import { getMergedAccessor } from '../composable_profile';
import type { GetProfilesOptions } from '../profiles_manager';
import { useProfiles } from './use_profiles';
import type { Profile } from '../types';

export const useProfileAccessor = <TKey extends keyof Profile>(
  key: TKey,
  options: GetProfilesOptions = {}
) => {
  const profiles = useProfiles(options);

  return useCallback(
    (baseImpl: Profile[TKey]) => getMergedAccessor(profiles, key, baseImpl),
    [key, profiles]
  );
};
