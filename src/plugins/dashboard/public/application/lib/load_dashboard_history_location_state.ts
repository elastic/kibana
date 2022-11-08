/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ForwardedDashboardState } from '../../locator';
import { DashboardState } from '../../types';
import { convertSavedPanelsToPanelMap } from './convert_dashboard_panels';

export const loadDashboardHistoryLocationState = (
  state?: ForwardedDashboardState
): Partial<DashboardState> => {
  if (!state) {
    return {};
  }

  const { panels, ...restOfState } = state;
  if (!panels?.length) {
    return restOfState;
  }

  return {
    ...restOfState,
    ...{ panels: convertSavedPanelsToPanelMap(panels) },
  };
};
