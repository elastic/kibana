/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MockSerializedDashboardState } from './types';

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
  panels: {
    panel1: { id: 'panel1', gridData: { i: 'panel1', x: 0, y: 0, w: 4, h: 3, row: 0 } },
    panel2: { id: 'panel2', gridData: { i: 'panel2', x: 0, y: 3, w: 4, h: 2, row: 0 } },
    panel3: { id: 'panel3', gridData: { i: 'panel3', x: 0, y: 5, w: 8, h: 1, row: 0 } },
    panel4: { id: 'panel4', gridData: { i: 'panel4', x: 4, y: 0, w: 4, h: 5, row: 0 } },
  },
  rows: [{ title: 'Large section', collapsed: false }],
};
