/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { useMemo } from 'react';
import { useAppStateSelector } from '../application/main/state_management/discover_app_state_container';
import { useInternalStateSelector } from '../application/main/state_management/discover_internal_state_container';
import { getMergedAccessor, Profile } from './composable_profile';
import { dataSourceProfileService, recordHasProfile } from './profiles';
import { useProfiles } from './profiles_provider';

export const useProfileAccessor = <TKey extends keyof Profile>(
  key: TKey,
  baseImpl: Profile[TKey],
  { record }: { record?: DataTableRecord } = {}
) => {
  const dataSource = useAppStateSelector((state) => state.dataSource);
  const dataView = useInternalStateSelector((state) => state.dataView);
  const query = useAppStateSelector((state) => state.query);
  const dataSourceProfile = useMemo(
    () => dataSourceProfileService.resolve({ dataSource, dataView, query }),
    [dataSource, dataView, query]
  );
  const { profiles } = useProfiles();

  return useMemo(() => {
    const allProfiles = [...profiles, dataSourceProfile];

    if (recordHasProfile(record)) {
      allProfiles.push(record.profile);
    }

    return getMergedAccessor(allProfiles, key, baseImpl);
  }, [baseImpl, dataSourceProfile, key, profiles, record]);
};
