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
import { DiscoverStateContainer } from '../services/discover_state';
import { DataTableRecord } from '../../../types';
import { AggregateRequestAdapter } from '../utils/aggregate_request_adapter';

export interface InspectorAdapters {
  requests: RequestAdapter;
  lensRequests?: RequestAdapter;
}

export function useInspector({
  setExpandedDoc,
  inspector,
  inspectorAdapters,
  stateContainer,
}: {
  inspectorAdapters: InspectorAdapters;
  stateContainer: DiscoverStateContainer;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  inspector: InspectorPublicPluginStart;
}) {
  const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);

  const onOpenInspector = useCallback(() => {
    // prevent overlapping
    setExpandedDoc(undefined);

    const requestAdapters = inspectorAdapters.lensRequests
      ? [inspectorAdapters.requests, inspectorAdapters.lensRequests]
      : [inspectorAdapters.requests];

    const session = inspector.open(
      { requests: new AggregateRequestAdapter(requestAdapters) },
      { title: stateContainer.savedSearchState.get().title }
    );

    setInspectorSession(session);
  }, [
    setExpandedDoc,
    inspectorAdapters.lensRequests,
    inspectorAdapters.requests,
    inspector,
    stateContainer.savedSearchState,
  ]);

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
