/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CanAddNewPanel,
  CanExpandPanels,
  HasSerializedChildState,
  PresentationContainer,
} from '@kbn/presentation-containers';
import { PublishesWritableViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';

export interface DashboardGridData {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
}

interface DashboardPanelState {
  type: string;
  gridData: DashboardGridData & { row?: string };
  explicitInput: Partial<any> & { id: string };
  version?: string;
}

export interface MockedDashboardPanelMap {
  [key: string]: DashboardPanelState;
}

export interface MockedDashboardRowMap {
  [id: string]: { id: string; order: number; title: string; collapsed: boolean };
}

export interface MockSerializedDashboardState {
  panels: MockedDashboardPanelMap;
  rows: MockedDashboardRowMap;
}

export type MockDashboardApi = PresentationContainer &
  CanAddNewPanel &
  HasSerializedChildState &
  PublishesWritableViewMode &
  CanExpandPanels & {
    panels$: BehaviorSubject<MockedDashboardPanelMap>;
    rows$: BehaviorSubject<MockedDashboardRowMap>;
  };
