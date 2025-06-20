/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataSourceContext, RootContext } from '../../../context_awareness';
import type { ContextWithProfileId } from '../../../context_awareness/profile_service';
import {
  useScopedProfilesManager,
  type DataTableRecordWithContext,
} from '../../../context_awareness/profiles_manager';
import { recordHasContext } from '../../../context_awareness/profiles_manager/record_has_context';
import { FetchStatus } from '../../types';
import type { DataDocuments$ } from '../state_management/discover_data_state_container';

export interface Profiles {
  rootContext: ContextWithProfileId<RootContext>;
  dataSourceContext: ContextWithProfileId<DataSourceContext>;
  documentContexts: Record<string, DataTableRecordWithContext[]>;
}

export interface ProfilesAdapter {
  getRootProfile: () => ContextWithProfileId<RootContext>;
  getDataSourceProfile: () => ContextWithProfileId<DataSourceContext>;
  getDocumentsProfiles: () => Record<string, DataTableRecordWithContext[]>;
  openDocDetails: (record: DataTableRecord) => void;
}

export function useActiveProfiles({ dataDocuments$ }: { dataDocuments$: DataDocuments$ }) {
  const scopedProfilesManager = useScopedProfilesManager();

  function getProfilesAdapter({
    onOpenDocDetails,
  }: {
    onOpenDocDetails: (record: DataTableRecord) => void;
  }): ProfilesAdapter {
    const { dataSourceContext$, rootContext$ } = scopedProfilesManager.getContexts$();

    return {
      getRootProfile: () => rootContext$.getValue(),
      getDataSourceProfile: () => dataSourceContext$.getValue(),
      getDocumentsProfiles: () => {
        const data = dataDocuments$.getValue();
        if (data.fetchStatus !== FetchStatus.COMPLETE) {
          return {};
        }

        const documents = data.result ?? [];
        const documentContexts: Record<string, DataTableRecordWithContext[]> = {};

        for (const record of documents) {
          if (!recordHasContext(record)) continue;

          const contextProfileId = record.context.profileId;
          if (!documentContexts[contextProfileId]) {
            documentContexts[contextProfileId] = [];
          }
          documentContexts[contextProfileId].push(record);
        }

        return documentContexts;
      },
      openDocDetails: onOpenDocDetails,
    };
  }

  return getProfilesAdapter;
}
