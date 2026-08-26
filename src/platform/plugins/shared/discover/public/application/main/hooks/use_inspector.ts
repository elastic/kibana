/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  InspectorSession,
  Start as InspectorPublicPluginStart,
} from '@kbn/inspector-plugin/public';
import type { DiscoverDataStateContainer } from '../state_management/discover_data_state_container';
import type { CascadedDocumentsFetcher } from '../data_fetching/cascaded_documents_fetcher';
import { AggregateRequestAdapter } from '../utils/aggregate_request_adapter';
import {
  internalStateActions,
  useInternalStateSelector,
  useCurrentTabAction,
  useInternalStateDispatch,
  useCurrentTabSelector,
  useRuntimeStateManager,
  selectTabRuntimeState,
} from '../state_management/redux';
import { createContextsAdapter } from '../../../context_awareness/hooks';

/**
 * Builds an AggregateRequestAdapter from the data state container's inspector adapters
 * and the cascaded documents fetcher.
 */
const getInspectorRequestAdapters = (
  dataStateContainer: DiscoverDataStateContainer,
  cascadedDocumentsFetcher: CascadedDocumentsFetcher
): AggregateRequestAdapter => {
  const { inspectorAdapters } = dataStateContainer;
  const requestAdapters = [
    inspectorAdapters.requests,
    inspectorAdapters.lensRequests,
    cascadedDocumentsFetcher.getRequestAdapter(),
  ].filter((adapter) => !!adapter);

  return new AggregateRequestAdapter(requestAdapters);
};

export function useInspector({ inspector }: { inspector: InspectorPublicPluginStart }) {
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );

  const dispatch = useInternalStateDispatch();
  const currentTabId = useCurrentTabSelector((state) => state.id);
  const runtimeStateManager = useRuntimeStateManager();
  const setExpandedDoc = useCurrentTabAction(internalStateActions.setExpandedDoc);

  const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);

  const onOpenInspector = useCallback(
    (onClose?: () => void) => {
      const tabRuntimeState = selectTabRuntimeState(runtimeStateManager, currentTabId);
      const dataStateContainer = tabRuntimeState?.dataStateContainer$.getValue();

      if (!dataStateContainer || !tabRuntimeState) {
        return;
      }

      const cascadedDocumentsFetcher = tabRuntimeState.cascadedDocumentsFetcher$.getValue();
      const scopedProfilesManager = tabRuntimeState.scopedProfilesManager$.getValue();
      const getContextsAdapter = createContextsAdapter({
        scopedProfilesManager,
        dataDocuments$: dataStateContainer.data$.documents$,
      });

      // prevent overlapping
      dispatch(setExpandedDoc({ expandedDoc: undefined }));

      const session = inspector.open(
        {
          requests: getInspectorRequestAdapters(dataStateContainer, cascadedDocumentsFetcher),
          contexts: getContextsAdapter({
            onOpenDocDetails: (record) => {
              session?.close();
              dispatch(setExpandedDoc({ expandedDoc: record }));
            },
          }),
        },
        { title: persistedDiscoverSession?.title }
      );

      setInspectorSession(session);

      if (onClose) {
        session?.onClose.then(() => {
          onClose();
        });
      }
    },
    [
      currentTabId,
      dispatch,
      inspector,
      persistedDiscoverSession?.title,
      runtimeStateManager,
      setExpandedDoc,
    ]
  );

  useEffect(() => {
    return () => {
      if (inspectorSession) {
        // Close the inspector if this scope is destroyed (e.g. because the user navigates away).
        inspectorSession.close();
      }
    };
  }, [inspectorSession]);
  return onOpenInspector;
}
