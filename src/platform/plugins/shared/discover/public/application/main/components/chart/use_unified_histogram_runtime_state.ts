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
  selectRestorableTabRuntimeHistogramLayoutProps,
  useCurrentTabSelector,
} from '../../state_management/redux';
import { useDiscoverHistogram } from './use_discover_histogram';
import type { DiscoverStateContainer } from '../../state_management/discover_state';

export const useUnifiedHistogramRuntimeState = (stateContainer: DiscoverStateContainer) => {
  const currentTabId = useCurrentTabSelector((tab) => tab.id);

  const [options] = useState<{
    initialLayoutProps: ReturnType<typeof selectRestorableTabRuntimeHistogramLayoutProps>;
  }>(() => ({
    initialLayoutProps: selectRestorableTabRuntimeHistogramLayoutProps(
      stateContainer.runtimeStateManager,
      currentTabId
    ),
  }));

  const unifiedHistogramProps = useDiscoverHistogram(stateContainer, options);

  return { currentTabId, unifiedHistogramProps };
};
