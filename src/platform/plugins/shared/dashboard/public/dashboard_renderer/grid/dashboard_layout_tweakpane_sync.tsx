/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

import { useDashboardInternalApi } from '../../dashboard_api/use_dashboard_internal_api';
import { useDashboardLayoutTweakpane } from './use_dashboard_layout_tweakpane';

/**
 * Pushes Tweakpane-driven layout values into {@link DashboardInternalApi.layoutTweak$} so
 * siblings of the viewport (e.g. top nav) can align padding and background with the canvas.
 */
export function DashboardLayoutTweakpaneSync() {
  const internalApi = useDashboardInternalApi();
  const {
    marginGutterPx,
    horizontalPaddingPx,
    panelBorderRadiusPx,
    panelPaddingVerticalPx,
    panelPaddingHorizontalPx,
    dashboardBackgroundToken,
  } = useDashboardLayoutTweakpane();

  useEffect(() => {
    internalApi.layoutTweak$.next({
      marginGutterPx,
      horizontalPaddingPx,
      panelBorderRadiusPx,
      panelPaddingVerticalPx,
      panelPaddingHorizontalPx,
      dashboardBackgroundToken,
    });
  }, [
    internalApi,
    marginGutterPx,
    horizontalPaddingPx,
    panelBorderRadiusPx,
    panelPaddingVerticalPx,
    panelPaddingHorizontalPx,
    dashboardBackgroundToken,
  ]);

  return null;
}
