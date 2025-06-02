/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '../../../common/types';

export function getOverrideState(): Partial<DashboardState> {
  let stateFromLocator: Partial<DashboardState> = {};
  try {
    stateFromLocator = extractDashboardState(getScopedHistory().location.state);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Unable to extract dashboard state from locator. Error: ', e);
  }

  let initialUrlState: Partial<DashboardState> = {};
  try {
    initialUrlState = loadAndRemoveDashboardState(kbnUrlStateStorage);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Unable to extract dashboard state from URL. Error: ', e);
  }
}
