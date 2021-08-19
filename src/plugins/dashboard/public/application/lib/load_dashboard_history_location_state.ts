/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { convertSavedDashboardPanelToPanelState } from '../../../common/embeddable/embeddable_saved_object_converters';
import { ForwardedDashboardState } from '../../locator';
import { DashboardPanelMap, DashboardState } from '../../types';

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

  const panelsMap: DashboardPanelMap = {};
  panels!.forEach((panel, idx) => {
    panelsMap![panel.panelIndex ?? String(idx)] = convertSavedDashboardPanelToPanelState(panel);
  });

  return {
    ...restOfState,
    ...{ panels: panelsMap },
  };
};
