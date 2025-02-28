/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  useHasBanner,
  useHasFooter,
  useIsToolboxOpen,
  useToolboxSize,
  useIsChromeVisible,
  useIsNavigationCollapsed,
} from '@kbn/core-workspace-state';
import { useIs2030 } from '@kbn/core-workspace-state';
import { WorkspaceGlobalCSSComponent } from './workspace_global_css.component';

export const WorkspaceGlobalCSS = () => {
  const hasBanner = useHasBanner();
  const hasFooter = useHasFooter();
  const isToolboxOpen = useIsToolboxOpen();
  const toolboxSize = useToolboxSize();
  const isChromeVisible = useIsChromeVisible();
  const isNavigationCollapsed = useIsNavigationCollapsed();
  const is2030 = useIs2030();

  return (
    <WorkspaceGlobalCSSComponent
      {...{
        hasBanner,
        hasFooter,
        isToolboxOpen,
        toolboxSize,
        isChromeVisible,
        isNavigationCollapsed,
        is2030,
      }}
    />
  );
};
