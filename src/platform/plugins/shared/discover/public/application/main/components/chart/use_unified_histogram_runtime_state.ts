/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import useLatest from 'react-use/lib/useLatest';
import { selectTabRuntimeState, useCurrentTabSelector } from '../../state_management/redux';
import type { UseUnifiedHistogramOptions } from './use_discover_histogram';
import { useDiscoverHistogram } from './use_discover_histogram';
import type { DiscoverStateContainer } from '../../state_management/discover_state';

export const useUnifiedHistogramRuntimeState = (stateContainer: DiscoverStateContainer) => {
  const currentTabId = useCurrentTabSelector((tab) => tab.id);
  const [options, setOptions] = useState<UseUnifiedHistogramOptions>({
    initialLayoutProps: undefined,
  });

  const [layoutProps$] = useState(
    () =>
      selectTabRuntimeState(stateContainer.runtimeStateManager, currentTabId)
        .unifiedHistogramLayoutProps$
  );

  const updateTopPanelHeight = useLatest(() => {
    layoutProps$.next({ ...layoutProps$.getValue(), topPanelHeight: undefined });
  });

  useEffect(() => {
    const subscription = layoutProps$.subscribe((newLayoutProps) => {
      setOptions((prevState) => ({
        initialLayoutProps: { ...(prevState.initialLayoutProps ?? {}), ...newLayoutProps },
      }));
    });

    return () => subscription.unsubscribe();
  }, [layoutProps$]);

  useEffect(() => {
    updateTopPanelHeight.current();
  }, [updateTopPanelHeight]);

  const unifiedHistogramProps = useDiscoverHistogram(stateContainer, options);

  return { currentTabId, unifiedHistogramProps };
};
