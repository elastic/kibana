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
import { useContainer } from '../application/main/state_management/discover_state_provider';
import { useDiscoverServices } from '../hooks/use_discover_services';
import { ComposableProfile, getMergedAccessor, Profile } from './composable_profile';
import { dataSourceProfileService, documentProfileService, rootProfileService } from './profiles';

export const useProfileAccessor = <TKey extends keyof Profile>(
  key: TKey,
  defaultImplementation: Profile[TKey],
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
  const stateContainer = useContainer();
  const documents = useObservable(stateContainer?.dataState.data$.documents$!);
  const documentContexts = useMemo(
    () =>
      (documents?.result ?? []).reduce(
        (map, curr) => map.set(curr.id, documentProfileService.resolve({ record: curr })),
        new Map<string, ComposableProfile>()
      ),
    [documents]
  );

  return useMemo(() => {
    const profiles = [rootProfile, dataSourceProfile];

    if (record) {
      const documentContext = documentContexts.get(record.id);

      if (documentContext) {
        profiles.push(documentContext);
      }
    }

    return getMergedAccessor(profiles, key, defaultImplementation);
  }, [rootProfile, dataSourceProfile, record, key, defaultImplementation, documentContexts]);
};
