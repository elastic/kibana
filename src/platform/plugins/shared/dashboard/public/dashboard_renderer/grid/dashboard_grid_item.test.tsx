/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { buildMockDashboardApi } from '../../mocks';
import type { Props as DashboardGridItemProps } from './dashboard_grid_item';
import { Item } from './dashboard_grid_item';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../dashboard_api/use_dashboard_internal_api';
import { act, render } from '@testing-library/react';

// Alias required so the jest.mock factory can reference useEffect without triggering
// Babel's hoisting guard (only `mock`-prefixed names are allowed inside factories).
const mockUseEffect = React.useEffect;

// Captures the onApiAvailable callback from the most-recently-rendered EmbeddableRenderer
// so tests can simulate the embeddable API becoming available after mount.
let capturedOnApiAvailable: ((api: DefaultEmbeddableApi) => void) | undefined;

jest.mock('@kbn/embeddable-plugin/public', () => {
  const original = jest.requireActual('@kbn/embeddable-plugin/public');

  return {
    ...original,
    EmbeddableRenderer: ({ onApiAvailable, maybeId }: any) => {
      mockUseEffect(() => {
        capturedOnApiAvailable = onApiAvailable;
      }, []);
      return (
        <div className="embedPanel" id={`mockEmbedPanel_${maybeId}`}>
          mockEmbeddablePanel
        </div>
      );
    },
  };
});

beforeEach(() => {
  capturedOnApiAvailable = undefined;
});

// Value of panel type does not effect test output
// since test mocks EmbeddableRenderer to render static content regardless of embeddable type
const TEST_EMBEDDABLE = 'TEST_EMBEDDABLE';

const buildMockChildApi = (id: string): DefaultEmbeddableApi =>
  ({
    uuid: id,
    type: TEST_EMBEDDABLE,
    relatedPanels$: new BehaviorSubject<string[]>([]),
  } as unknown as DefaultEmbeddableApi);

const createAndMountDashboardGridItem = (props: DashboardGridItemProps) => {
  const panels = [
    {
      grid: { x: 0, y: 0, w: 6, h: 6, i: '1' },
      type: TEST_EMBEDDABLE,
      config: {},
      id: '1',
    },
    {
      grid: { x: 6, y: 6, w: 6, h: 6, i: '2' },
      type: TEST_EMBEDDABLE,
      config: {},
      id: '2',
    },
  ];
  const { api, internalApi } = buildMockDashboardApi({ overrides: { panels } });

  panels.forEach((panel) => {
    api.registerChildApi(buildMockChildApi(panel.id));
  });

  const component = render(
    <DashboardContext.Provider value={api}>
      <DashboardInternalContext.Provider value={internalApi}>
        <Item {...props} />
      </DashboardInternalContext.Provider>
    </DashboardContext.Provider>
  );
  return { dashboardApi: api, component };
};

test('renders Item', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
  });
  const panelElements = component.getAllByTestId('dashboardPanel');
  expect(panelElements.length).toBe(1);

  const panelElement = component.container.querySelector('#panel-1');
  expect(panelElement).not.toBeNull();
  expect(panelElement!.classList.contains('dshDashboardGrid__item--expanded')).toBe(false);
  expect(panelElement!.classList.contains('dshDashboardGrid__item--hidden')).toBe(false);
  expect(panelElement!.classList.contains('dshDashboardGrid__item--focused')).toBe(false);
  expect(panelElement!.classList.contains('dshDashboardGrid__item--blurred')).toBe(false);
});

test('renders expanded panel', async () => {
  const { component, dashboardApi } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
  });

  // maximize rendered panel
  await act(async () => {
    dashboardApi.expandPanel('1');
    await new Promise((resolve) => setTimeout(resolve, 1));
  });

  const panelElement = component.container.querySelector('#panel-1');
  expect(panelElement).not.toBeNull();
  expect(panelElement!.classList.contains('dshDashboardGrid__item--expanded')).toBe(true);
  expect(panelElement!.classList.contains('dshDashboardGrid__item--hidden')).toBe(false);
});

test('renders hidden panel', async () => {
  const { component, dashboardApi } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
  });

  // maximize non-rendered panel
  await act(async () => {
    dashboardApi.expandPanel('2');
    await new Promise((resolve) => setTimeout(resolve, 1));
  });

  const panelElement = component.container.querySelector('#panel-1');
  expect(panelElement).not.toBeNull();
  expect(panelElement!.classList.contains('dshDashboardGrid__item--expanded')).toBe(false);
  expect(panelElement!.classList.contains('dshDashboardGrid__item--hidden')).toBe(true);
});

test('renders focused panel', async () => {
  const { component, dashboardApi } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
  });

  // focus rendered panel
  await act(async () => {
    dashboardApi.setFocusedPanelId('1');
    await new Promise((resolve) => setTimeout(resolve, 1));
  });

  const panelElement = component.container.querySelector('#panel-1');
  expect(panelElement).not.toBeNull();
  expect(panelElement!.classList.contains('dshDashboardGrid__item--focused')).toBe(true);
  expect(panelElement!.classList.contains('dshDashboardGrid__item--blurred')).toBe(false);
});

test('renders blurred panel', async () => {
  const { component, dashboardApi } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
  });

  // focus non-rendered panel
  await act(async () => {
    dashboardApi.setFocusedPanelId('2');
    await new Promise((resolve) => setTimeout(resolve, 1));
  });

  const panelElement = component.container.querySelector('#panel-1');
  expect(panelElement).not.toBeNull();
  expect(panelElement!.classList.contains('dshDashboardGrid__item--focused')).toBe(false);
  expect(panelElement!.classList.contains('dshDashboardGrid__item--blurred')).toBe(true);
});

/**
 * Waits for the mock EmbeddableRenderer's useEffect to capture onApiAvailable,
 * then calls it with the given api to simulate the embeddable finishing its setup.
 */
const simulateApiAvailable = async (api: DefaultEmbeddableApi) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
  await act(async () => {
    capturedOnApiAvailable?.(api);
    await new Promise((resolve) => setTimeout(resolve, 1));
  });
};

describe('cancelRequests on unmount', () => {
  test('calls cancelRequests when the embeddable supports it', async () => {
    const cancelRequests = jest.fn();
    const mockApi = {
      ...buildMockChildApi('1'),
      cancelRequests,
    } as unknown as DefaultEmbeddableApi;

    const { component } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });

    await simulateApiAvailable(mockApi);

    component.unmount();

    expect(cancelRequests).toHaveBeenCalledTimes(1);
  });

  test('does not call cancelRequests when the embeddable does not support it', async () => {
    const mockApi = buildMockChildApi('1'); // no cancelRequests method
    expect((mockApi as any).cancelRequests).toBeUndefined();

    const { component } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });

    await simulateApiAvailable(mockApi);

    expect(() => component.unmount()).not.toThrow();
  });

  test('does not throw when unmounted before the embeddable API is available', () => {
    const { component } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });

    // Unmount before onApiAvailable is ever called (embeddable still loading)
    expect(() => component.unmount()).not.toThrow();
  });
});
