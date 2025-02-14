/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScopedHistory } from '@kbn/core-application-browser';

import { ForwardedDashboardState } from './locator';
import { convertPanelsArrayToPanelMap } from '../../../common';
import { DashboardState } from '../../dashboard_api/types';

export const loadDashboardHistoryLocationState = (
  getScopedHistory: () => ScopedHistory
): Partial<DashboardState> => {
  const state = getScopedHistory().location.state as undefined | ForwardedDashboardState;

  if (!state) {
    return {};
  }

  const { panels, ...restOfState } = state;
  if (!panels?.length) {
    return restOfState;
  }

  return {
    ...restOfState,
    ...{ panels: convertPanelsArrayToPanelMap(panels) },
  };
};
