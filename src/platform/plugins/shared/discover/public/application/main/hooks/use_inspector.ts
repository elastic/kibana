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
import type { DiscoverStateContainer } from '../state_management/discover_state';
import { AggregateRequestAdapter } from '../utils/aggregate_request_adapter';
import {
  internalStateActions,
  useInternalStateSelector,
  useCurrentTabAction,
  useInternalStateDispatch,
  useCurrentTabRuntimeState,
} from '../state_management/redux';
import { useActiveContexts } from '../../../context_awareness/hooks';

export function useInspector({
  inspector,
  stateContainer,
}: {
  inspector: InspectorPublicPluginStart;
  stateContainer: DiscoverStateContainer;
}) {
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );

  const dispatch = useInternalStateDispatch();
  const setExpandedDoc = useCurrentTabAction(internalStateActions.setExpandedDoc);

  const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);

  const cascadedDocumentsFetcher = useCurrentTabRuntimeState(
    stateContainer.runtimeStateManager,
    (runtimeState) => runtimeState.cascadedDocumentsFetcher$
  );

  const getContextsAdapter = useActiveContexts({
    dataDocuments$: stateContainer.dataState.data$.documents$,
  });

  const onOpenInspector = useCallback(
    (onClose?: () => void) => {
      // prevent overlapping
      dispatch(setExpandedDoc({ expandedDoc: undefined }));

      const inspectorAdapters = stateContainer.dataState.inspectorAdapters;

      const requestAdapters = [
        inspectorAdapters.requests,
        inspectorAdapters.lensRequests,
        cascadedDocumentsFetcher.getRequestAdapter(),
      ].filter((adapter) => !!adapter);

      const session = inspector.open(
        {
          requests: new AggregateRequestAdapter(requestAdapters),
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
      dispatch,
      setExpandedDoc,
      cascadedDocumentsFetcher,
      stateContainer.dataState.inspectorAdapters,
      inspector,
      getContextsAdapter,
      persistedDiscoverSession?.title,
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
