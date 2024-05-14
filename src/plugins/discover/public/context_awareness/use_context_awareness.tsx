/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useAppStateSelector } from '../application/main/state_management/discover_app_state_container';
import { useInternalStateSelector } from '../application/main/state_management/discover_internal_state_container';
import { useContainer } from '../application/main/state_management/discover_state_provider';
import { useDiscoverServices } from '../hooks/use_discover_services';
import {
  dataSourceContextService,
  DocumentContext,
  documentContextService,
  rootContextService,
} from './context_types';

export const useContextAwareness = () => {
  const { chrome } = useDiscoverServices();
  const [solutionNavId$] = useState(() => chrome.getActiveSolutionNavId$());
  const solutionNavId = useObservable(solutionNavId$);
  const rootContext = useMemo(() => rootContextService.resolve({ solutionNavId }), [solutionNavId]);
  const dataSource = useAppStateSelector((state) => state.dataSource);
  const dataView = useInternalStateSelector((state) => state.dataView);
  const query = useAppStateSelector((state) => state.query);
  const dataSourceContext = useMemo(
    () => dataSourceContextService.resolve({ dataSource, dataView, query }),
    [dataSource, dataView, query]
  );
  const stateContainer = useContainer();
  const documents = useObservable(stateContainer?.dataState.data$.documents$!);
  const documentContexts = useMemo(
    () =>
      (documents?.result ?? []).reduce(
        (map, record) => map.set(record.id, documentContextService.resolve({ record })),
        new Map<string, DocumentContext>()
      ),
    [documents]
  );

  return { rootContext, dataSourceContext, documentContexts };
};
