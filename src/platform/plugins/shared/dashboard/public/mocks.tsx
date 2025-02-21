/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { BehaviorSubject } from 'rxjs';
import { DashboardStart } from './plugin';
import { DashboardState } from './dashboard_api/types';
import { getDashboardApi } from './dashboard_api/get_dashboard_api';
import { DashboardPanelState } from '../common';

export type Start = jest.Mocked<DashboardStart>;

const createStartContract = (): DashboardStart => {
  // @ts-ignore
  const startContract: DashboardStart = {};

  return startContract;
};

export const dashboardPluginMock = {
  createStartContract,
};

/**
 * Utility function that mocks the `IntersectionObserver` API. Necessary for components that rely
 * on it, otherwise the tests will crash. Recommended to execute inside `beforeEach`.
 *
 * @param intersectionObserverMock - Parameter that is sent to the `Object.defineProperty`
 * overwrite method. `jest.fn()` mock functions can be passed here if the goal is to not only
 * mock the intersection observer, but its methods.
 */
export function setupIntersectionObserverMock({
  root = null,
  rootMargin = '',
  thresholds = [],
  disconnect = () => null,
  observe = () => null,
  takeRecords = () => [],
  unobserve = () => null,
} = {}): void {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | null = root;
    readonly rootMargin: string = rootMargin;
    readonly thresholds: readonly number[] = thresholds;
    disconnect: () => void = disconnect;
    observe: (target: Element) => void = observe;
    takeRecords: () => IntersectionObserverEntry[] = takeRecords;
    unobserve: (target: Element) => void = unobserve;
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  Object.defineProperty(global, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
}

export const mockControlGroupApi = {
  untilInitialized: async () => {},
  filters$: new BehaviorSubject(undefined),
  query$: new BehaviorSubject(undefined),
  timeslice$: new BehaviorSubject(undefined),
  esqlVariables$: new BehaviorSubject(undefined),
  dataViews$: new BehaviorSubject(undefined),
  unsavedChanges$: new BehaviorSubject(undefined),
} as unknown as ControlGroupApi;

export function buildMockDashboardApi({
  overrides,
  savedObjectId,
}: {
  overrides?: Partial<DashboardState>;
  savedObjectId?: string;
} = {}) {
  const initialState = getSampleDashboardState(overrides);
  const results = getDashboardApi({
    initialState,
    savedObjectId,
    savedObjectResult: {
      dashboardFound: true,
      newDashboardCreated: savedObjectId === undefined,
      dashboardId: savedObjectId,
      managed: false,
      dashboardInput: {
        ...initialState,
      },
      references: [],
    },
  });
  results.internalApi.setControlGroupApi(mockControlGroupApi);
  return results;
}

export function getSampleDashboardState(overrides?: Partial<DashboardState>): DashboardState {
  return {
    // options
    useMargins: true,
    syncColors: false,
    syncCursor: true,
    syncTooltips: false,
    hidePanelTitles: false,

    tags: [],
    filters: [],
    title: 'My Dashboard',
    query: {
      language: 'kuery',
      query: 'hi',
    },
    timeRange: {
      to: 'now',
      from: 'now-15m',
    },
    timeRestore: false,
    viewMode: 'view',
    panels: {},
    ...overrides,
  };
}

export function getSampleDashboardPanel(
  overrides: Partial<DashboardPanelState> & {
    explicitInput: { id: string };
    type: string;
  }
): DashboardPanelState {
  return {
    gridData: {
      h: 15,
      w: 15,
      x: 0,
      y: 0,
      i: overrides.explicitInput.id,
    },
    ...overrides,
  };
}
