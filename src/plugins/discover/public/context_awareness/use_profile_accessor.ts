/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { useMemo } from 'react';
import { getMergedAccessor } from './composable_profile';
import { recordHasProfile } from './profiles';
import { useProfiles } from './profiles_provider';
import type { Profile } from './types';

export const useProfileAccessor = <TKey extends keyof Profile>(
  key: TKey,
  baseImpl: Profile[TKey],
  { record }: { record?: DataTableRecord } = {}
) => {
  const profiles = useProfiles();

  return useMemo(() => {
    let allProfiles = profiles;

    if (recordHasProfile(record)) {
      allProfiles = [...profiles, record.profile];
    }

    return getMergedAccessor(allProfiles, key, baseImpl);
  }, [baseImpl, key, profiles, record]);
};
