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
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DataTableRecord } from '../../../types';

export function useInspector({
  setExpandedDoc,
  inspector,
  inspectorAdapters,
  savedSearch,
}: {
  inspectorAdapters: { requests: RequestAdapter };
  savedSearch: SavedSearch;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  inspector: InspectorPublicPluginStart;
}) {
  const [inspectorSession, setInspectorSession] = useState<InspectorSession | undefined>(undefined);

  const onOpenInspector = useCallback(() => {
    // prevent overlapping
    setExpandedDoc(undefined);
    const session = inspector.open(inspectorAdapters, {
      title: savedSearch.title,
    });
    setInspectorSession(session);
  }, [setExpandedDoc, inspectorAdapters, savedSearch, inspector]);

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
