/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface DashboardGridData {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}

interface DashboardPanelState {
  type: string;
  gridData: DashboardGridData & { row?: number };
  explicitInput: Partial<any> & { id: string };
  version?: string;
}

export interface MockedDashboardPanelMap {
  [key: string]: DashboardPanelState;
}

export type MockedDashboardRowMap = Array<{ title: string; collapsed: boolean }>;

export interface MockSerializedDashboardState {
  panels: MockedDashboardPanelMap;
  rows: MockedDashboardRowMap;
}
