/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useAppStateSelector } from '../application/main/state_management/discover_app_state_container';
import { useInternalStateSelector } from '../application/main/state_management/discover_internal_state_container';
import { useDiscoverServices } from '../hooks/use_discover_services';
import { getMergedAccessor, Profile } from './composable_profile';
import { dataSourceProfileService, recordHasProfile, rootProfileService } from './profiles';

export const useProfileAccessor = <TKey extends keyof Profile>(
  key: TKey,
  baseImpl: Profile[TKey],
  { record }: { record?: DataTableRecord } = {}
) => {
  const { chrome } = useDiscoverServices();
  const [solutionNavId$] = useState(() => chrome.getActiveSolutionNavId$());
  const solutionNavId = useObservable(solutionNavId$);
  const rootProfile = useMemo(() => rootProfileService.resolve({ solutionNavId }), [solutionNavId]);
  const dataSource = useAppStateSelector((state) => state.dataSource);
  const dataView = useInternalStateSelector((state) => state.dataView);
  const query = useAppStateSelector((state) => state.query);
  const dataSourceProfile = useMemo(
    () => dataSourceProfileService.resolve({ dataSource, dataView, query }),
    [dataSource, dataView, query]
  );

  return useMemo(() => {
    const profiles = [rootProfile, dataSourceProfile];

    if (recordHasProfile(record)) {
      profiles.push(record.profile);
    }

    return getMergedAccessor(profiles, key, baseImpl);
  }, [rootProfile, dataSourceProfile, record, key, baseImpl]);
};
