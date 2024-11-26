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
    panel1: { id: 'panel1', gridData: { i: 'panel1', x: 0, y: 0, w: 12, h: 6, row: 0 } },
    panel2: { id: 'panel2', gridData: { i: 'panel2', x: 0, y: 6, w: 8, h: 4, row: 0 } },
    panel3: { id: 'panel3', gridData: { i: 'panel3', x: 8, y: 6, w: 12, h: 4, row: 0 } },
    panel4: { id: 'panel4', gridData: { i: 'panel4', x: 0, y: 10, w: 48, h: 4, row: 0 } },
    panel5: { id: 'panel5', gridData: { i: 'panel5', x: 12, y: 0, w: 36, h: 6, row: 0 } },
    panel6: { id: 'panel6', gridData: { i: 'panel6', x: 24, y: 6, w: 24, h: 4, row: 0 } },
    panel7: { id: 'panel7', gridData: { i: 'panel7', x: 20, y: 6, w: 4, h: 2, row: 0 } },
    panel8: { id: 'panel8', gridData: { i: 'panel8', x: 20, y: 8, w: 4, h: 2, row: 0 } },
    panel9: { id: 'panel9', gridData: { i: 'panel9', x: 0, y: 0, w: 12, h: 16, row: 1 } },
    panel10: { id: 'panel10', gridData: { i: 'panel10', x: 24, y: 0, w: 12, h: 6, row: 2 } },
  },
  rows: [
    { title: 'Large section', collapsed: false },
    { title: 'Small section', collapsed: false },
    { title: 'Another small section', collapsed: false },
  ],
};
