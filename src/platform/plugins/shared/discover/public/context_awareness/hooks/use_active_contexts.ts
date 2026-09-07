/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { useMemo } from 'react';
import type { DataSourceContext, RootContext } from '..';
import type { ContextWithProfileId } from '../profile_service';
import { type DataTableRecordWithContext, type ScopedProfilesManager } from '../profiles_manager';
import { recordHasContext } from '../profiles_manager/record_has_context';
import { FetchStatus } from '../../application/types';
import type { DataDocuments$ } from '../../application/main/state_management/discover_data_state_container';
import { useScopedServices } from '../../components/scoped_services_provider';

export interface Contexts {
  rootContext: ContextWithProfileId<RootContext>;
  dataSourceContext: ContextWithProfileId<DataSourceContext>;
  documentContexts: Record<string, DataTableRecordWithContext[]>;
}

export interface ContextsAdapter {
  getRootContext: () => ContextWithProfileId<RootContext>;
  getDataSourceContext: () => ContextWithProfileId<DataSourceContext>;
  getDocumentContexts: () => Record<string, DataTableRecordWithContext[]>;
  openDocDetails: (record: DataTableRecord) => void;
}

/**
 * Pure factory for the inspector Contexts adapter. Used by {@link useActiveContexts} and by
 * callers that cannot use hooks (e.g. tab menu onClick). Must receive the same
 * `scopedProfilesManager` and `dataDocuments$` as the active tab.
 */
export const createContextsAdapter = ({
  scopedProfilesManager,
  dataDocuments$,
}: {
  scopedProfilesManager: ScopedProfilesManager;
  dataDocuments$: DataDocuments$;
}) => {
  return ({
    onOpenDocDetails,
  }: {
    onOpenDocDetails: (record: DataTableRecord) => void;
  }): ContextsAdapter => {
    const { dataSourceContext, rootContext } = scopedProfilesManager.getContexts();

    return {
      getRootContext: () => rootContext,
      getDataSourceContext: () => dataSourceContext,
      getDocumentContexts: () => {
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
  };
};

export function useActiveContexts({ dataDocuments$ }: { dataDocuments$: DataDocuments$ }) {
  const { scopedProfilesManager } = useScopedServices();

  return useMemo(
    () => createContextsAdapter({ scopedProfilesManager, dataDocuments$ }),
    [scopedProfilesManager, dataDocuments$]
  );
}
