/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState } from 'react';
import {
  DEFAULT_HISTOGRAM_KEY_PREFIX,
  selectInitialUnifiedHistogramLayoutPropsMap,
  useCurrentTabSelector,
} from '../../state_management/redux';
import type { UseUnifiedHistogramOptions } from './use_discover_histogram';
import { useDiscoverHistogram } from './use_discover_histogram';
import type { DiscoverStateContainer } from '../../state_management/discover_state';

export const useUnifiedHistogramRuntimeState = (
  stateContainer: DiscoverStateContainer,
  localStorageKeyPrefix?: string
) => {
  const currentTabId = useCurrentTabSelector((tab) => tab.id);
  const [options] = useState<UseUnifiedHistogramOptions>(() => {
    const layoutPropsMap = selectInitialUnifiedHistogramLayoutPropsMap(
      stateContainer.runtimeStateManager,
      currentTabId
    );

    return {
      initialLayoutProps: layoutPropsMap[localStorageKeyPrefix ?? DEFAULT_HISTOGRAM_KEY_PREFIX],
    };
  });

  const unifiedHistogramProps = useDiscoverHistogram(stateContainer, options);

  return { currentTabId, unifiedHistogramProps };
};
