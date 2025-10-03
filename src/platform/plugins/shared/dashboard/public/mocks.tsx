/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlGroupApi } from '@kbn/controls-plugin/public';
import { BehaviorSubject } from 'rxjs';
import type { DashboardStart } from './plugin';
import type { DashboardState } from '../common/types';
import { getDashboardApi } from './dashboard_api/get_dashboard_api';
import { deserializeLayout } from './dashboard_api/layout_manager/deserialize_layout';

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
  hasUnsavedChanges$: new BehaviorSubject(false),
  children$: new BehaviorSubject([]),
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
    panels: [],
    ...overrides,
  };
}

export function getMockPanels() {
  return [
    {
      grid: { x: 0, y: 0, w: 6, h: 6, i: '1' },
      config: { title: 'panel One' },
      uid: '1',
      type: 'testPanelType',
    },
    {
      grid: { x: 6, y: 0, w: 6, h: 6, i: '2' },
      config: { title: 'panel Two' },
      uid: '2',
      type: 'testPanelType',
    },
  ];
}

export function getMockPanelsWithSections() {
  return [
    ...getMockPanels(),
    {
      title: 'Section One',
      collapsed: true,
      grid: {
        y: 6,
        i: 'section1',
      },
      panels: [
        {
          grid: { x: 0, y: 0, w: 6, h: 6, i: '3' },
          config: { title: 'panel Three' },
          uid: '3',
          type: 'testPanelType',
        },
      ],
    },
    {
      title: 'Section Two',
      collapsed: false,
      grid: {
        y: 7,
        i: 'section2',
      },
      panels: [
        {
          grid: { x: 0, y: 0, w: 6, h: 6, i: '4' },
          config: { title: 'panel Four' },
          uid: '4',
          type: 'testPanelType',
        },
      ],
    },
  ];
}

export function getMockLayout() {
  return deserializeLayout(getMockPanels(), () => []).layout;
}

export function getMockLayoutWithSections() {
  return deserializeLayout(getMockPanelsWithSections(), () => []).layout;
}
