/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  InspectorSession,
  RequestAdapter,
  Start as InspectorPublicPluginStart,
} from '@kbn/inspector-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DiscoverStateContainer } from '../state_management/discover_state';
import { AggregateRequestAdapter } from '../utils/aggregate_request_adapter';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

export interface InspectorAdapters {
  requests: RequestAdapter;
  lensRequests?: RequestAdapter;
}

export function useInspector({
  inspector,
  stateContainer,
}: {
  inspector: InspectorPublicPluginStart;
  stateContainer: DiscoverStateContainer;
}) {
  const { profilesAdapter } = useDiscoverServices();
  const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);

  const onOpenInspector = useCallback(() => {
    // prevent overlapping
    stateContainer.internalState.transitions.setExpandedDoc(undefined);

    const inspectorAdapters = stateContainer.dataState.inspectorAdapters;

    const requestAdapters = inspectorAdapters.lensRequests
      ? [inspectorAdapters.requests, inspectorAdapters.lensRequests]
      : [inspectorAdapters.requests];

    const session = inspector.open(
      { requests: new AggregateRequestAdapter(requestAdapters), profiles: profilesAdapter },
      { title: stateContainer.savedSearchState.getTitle() }
    );

    setInspectorSession(session);
  }, [stateContainer, inspector, profilesAdapter]);

  useEffect(() => {
    return () => {
      if (inspectorSession) {
        // Close the inspector if this scope is destroyed (e.g. because the user navigates away).
        inspectorSession.close();
      }
    };
  }, [inspectorSession]);

  useEffect(() => {
    const subscription = profilesAdapter
      .getViewRecordDetails$()
      .subscribe((record: DataTableRecord) => {
        inspectorSession?.close();
        stateContainer.internalState.transitions.setExpandedDoc(record);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [inspectorSession, profilesAdapter, stateContainer]);

  return onOpenInspector;
}
