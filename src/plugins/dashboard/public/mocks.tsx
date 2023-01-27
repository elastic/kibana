/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Embeddable, EmbeddableInput, ViewMode } from '@kbn/embeddable-plugin/public';
import { createReduxEmbeddableTools } from '@kbn/presentation-util-plugin/public/redux_embeddables/create_redux_embeddable_tools';

import { DashboardStart } from './plugin';
import { DashboardContainerInput, DashboardPanelState } from '../common';
import { DashboardContainerOutput, DashboardReduxState } from './dashboard_container/types';
import { DashboardContainer } from './dashboard_container/embeddable/dashboard_container';
import { dashboardContainerReducers } from './dashboard_container/state/dashboard_container_reducers';

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

export const mockDashboardReduxEmbeddableTools = async (
  partialState?: Partial<DashboardReduxState>
) => {
  const mockDashboard = new DashboardContainer(
    getSampleDashboardInput(partialState?.explicitInput)
  ) as Embeddable<DashboardContainerInput, DashboardContainerOutput>;

  const mockReduxEmbeddableTools = createReduxEmbeddableTools<DashboardReduxState>({
    embeddable: mockDashboard,
    reducers: dashboardContainerReducers,
    initialComponentState: { lastSavedInput: mockDashboard.getInput() },
  });

  return {
    tools: mockReduxEmbeddableTools,
    dashboardContainer: mockDashboard as DashboardContainer,
  };
};

export function getSampleDashboardInput(
  overrides?: Partial<DashboardContainerInput>
): DashboardContainerInput {
  return {
    // options
    useMargins: true,
    syncColors: false,
    syncCursor: true,
    syncTooltips: false,
    hidePanelTitles: false,

    id: '123',
    tags: [],
    filters: [],
    isEmbeddedExternally: false,
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
    viewMode: ViewMode.VIEW,
    panels: {},
    ...overrides,
  };
}

export function getSampleDashboardPanel<TEmbeddableInput extends EmbeddableInput = EmbeddableInput>(
  overrides: Partial<DashboardPanelState<TEmbeddableInput>> & {
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
