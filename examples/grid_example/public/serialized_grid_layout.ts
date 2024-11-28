/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MockSerializedDashboardState } from './types';

import logsPanels from './logs_dashboard_panels.json';

const STATE_SESSION_STORAGE_KEY = 'kibana.examples.gridExample.state';

export function clearSerializedDashboardState() {
  sessionStorage.removeItem(STATE_SESSION_STORAGE_KEY);
}

export function getSerializedDashboardState(): MockSerializedDashboardState {
  const serializedStateJSON = sessionStorage.getItem(STATE_SESSION_STORAGE_KEY);
  return serializedStateJSON ? JSON.parse(serializedStateJSON) : initialState;
}

export function setSerializedGridLayout(state: MockSerializedDashboardState) {
  sessionStorage.setItem(STATE_SESSION_STORAGE_KEY, JSON.stringify(state));
}

const initialState: MockSerializedDashboardState = {
  panels: logsPanels,
  rows: [
    { title: 'Request Sizes', collapsed: false },
    { title: 'Visitors', collapsed: false },
    { title: 'Response Codes', collapsed: false },
  ],
};
