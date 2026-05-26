/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subscription } from 'rxjs';
import type { DashboardState } from '../../common/types';
import type { DashboardInternalApi } from './types';
import type { PanelLimitState } from './panel_limit_validator';
import { validatePanelLimits } from './panel_limit_validator';

export const getDefaultPanelLimitState = (): PanelLimitState =>
  validatePanelLimits({ panels: [], pinned_panels: [] });

export const initializePanelLimitManager = ({
  dashboardInternalApi,
}: {
  dashboardInternalApi: Pick<DashboardInternalApi, 'anyStateChange$' | 'serializeLayout'>;
}): {
  panelLimitState$: BehaviorSubject<PanelLimitState>;
  getLatestPanelLimitState: () => PanelLimitState;
  cleanup: () => void;
} => {
  const panelLimitState$ = new BehaviorSubject<PanelLimitState>(getDefaultPanelLimitState());

  const updateState = () => {
    const { panels, pinned_panels } = dashboardInternalApi.serializeLayout();
    const nextState = validatePanelLimits({
      panels,
      pinned_panels: pinned_panels as DashboardState['pinned_panels'],
    });
    panelLimitState$.next(nextState);
  };

  // initialize immediately
  updateState();

  const subscriptions = new Subscription();
  subscriptions.add(dashboardInternalApi.anyStateChange$.subscribe(updateState));

  return {
    panelLimitState$,
    getLatestPanelLimitState: () => panelLimitState$.getValue(),
    cleanup: () => {
      subscriptions.unsubscribe();
      panelLimitState$.complete();
    },
  };
};
