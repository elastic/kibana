/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, distinctUntilChanged, filter, map } from 'rxjs';
import { useEffect, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataSourceContext, RootContext } from '../../../context_awareness';
import type { ContextWithProfileId } from '../../../context_awareness/profile_service';
import type { DataTableRecordWithContext } from '../../../context_awareness/profiles_manager';
import { recordHasContext } from '../../../context_awareness/record_has_context';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import type { DiscoverStateContainer } from '../state_management/discover_state';
import { FetchStatus } from '../../types';

export interface Profiles {
  rootContext: ContextWithProfileId<RootContext> | null;
  dataSourceContext: ContextWithProfileId<DataSourceContext> | null;
  documentContexts: Record<string, DataTableRecordWithContext[]>;
}

export interface ProfilesAdapter {
  getRootProfile: () => ContextWithProfileId<RootContext> | null;
  getDataSourceProfile: () => ContextWithProfileId<DataSourceContext> | null;
  getDocumentsProfiles: () => Record<string, DataTableRecordWithContext[]>;
  openDocDetails: (record: DataTableRecord) => void;
}

export function useActiveProfiles({ stateContainer }: { stateContainer: DiscoverStateContainer }) {
  const { profilesManager } = useDiscoverServices();
  const [usedProfiles, setUsedProfiles] = useState<Profiles>({
    rootContext: null,
    dataSourceContext: null,
    documentContexts: {},
  });

  useEffect(() => {
    const documentsSubscription = stateContainer.dataState.data$.documents$.pipe(
      distinctUntilChanged((a, b) => a.fetchStatus === b.fetchStatus),
      filter(({ fetchStatus }) => fetchStatus === FetchStatus.COMPLETE),
      map(({ result }) => result ?? [])
    );

    const subscription = combineLatest([profilesManager.getContexts$(), documentsSubscription])
      .pipe(
        map(([contexts, documents]) => {
          const documentContexts: Record<string, DataTableRecordWithContext[]> = {};

          for (const record of documents) {
            if (recordHasContext(record)) {
              if (!documentContexts[record.context.profileId]) {
                documentContexts[record.context.profileId] = [];
              }

              documentContexts[record.context.profileId].push(record);
            }
          }

          return {
            rootContext: contexts.rootContext,
            dataSourceContext: contexts.dataSourceContext,
            documentContexts,
          };
        })
      )
      .subscribe(setUsedProfiles);

    return () => {
      subscription.unsubscribe();
    };
  }, [profilesManager, stateContainer]);

  function getProfilesAdapter({
    onOpenDocDetails,
  }: {
    onOpenDocDetails: (record: DataTableRecord) => void;
  }): ProfilesAdapter {
    return {
      getRootProfile: () => usedProfiles.rootContext,
      getDataSourceProfile: () => usedProfiles.dataSourceContext,
      getDocumentsProfiles: () => usedProfiles.documentContexts,
      openDocDetails: onOpenDocDetails,
    };
  }

  return getProfilesAdapter;
}
