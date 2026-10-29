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
import { DashboardGridItem } from './dashboard_grid_item';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../dashboard_api/use_dashboard_internal_api';
import { PanelContextMenuContext } from './panel_context_menu';
import { act, fireEvent, render } from '@testing-library/react';

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
          <div className="kbnGridPanel--dragHandle" data-test-subj={`mockPanelHeader_${maybeId}`}>
            <span className="embPanel__titleInlineEdit">
              <button type="button" data-test-subj={`mockPanelTitle_${maybeId}`}>
                Panel title
              </button>
            </span>
          </div>
          <p data-test-subj={`mockPanelContent_${maybeId}`}>mockEmbeddablePanel</p>
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

const createAndMountDashboardGridItem = (
  props: DashboardGridItemProps,
  openContextMenu: jest.Mock = jest.fn()
) => {
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
        <PanelContextMenuContext.Provider value={{ openContextMenu }}>
          <DashboardGridItem {...props} />
        </PanelContextMenuContext.Provider>
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
  expect(panelElement!.classList.contains('dshDashboardGrid__item--selected')).toBe(false);
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

test('Cmd/Ctrl+click toggles panel selection and applies selected class', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
  });

  const panelElement = component.container.querySelector('#panel-1');
  expect(panelElement).not.toBeNull();
  expect(panelElement!.classList.contains('dshDashboardGrid__item--selected')).toBe(false);

  await act(async () => {
    panelElement!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true, ctrlKey: true })
    );
    await new Promise((resolve) => setTimeout(resolve, 1));
  });

  expect(panelElement!.classList.contains('dshDashboardGrid__item--selected')).toBe(true);

  await act(async () => {
    panelElement!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true, ctrlKey: true })
    );
    await new Promise((resolve) => setTimeout(resolve, 1));
  });

  expect(panelElement!.classList.contains('dshDashboardGrid__item--selected')).toBe(false);
});

describe('select mode clicks', () => {
  const setup = async () => {
    const { component, dashboardApi } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });
    await act(async () => {
      dashboardApi.setViewMode('edit');
      dashboardApi.setSelectedPanelIds(new Set(['2']));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    return { component, dashboardApi };
  };

  test('a plain click on panel content selects the panel', async () => {
    const { component, dashboardApi } = await setup();
    await act(async () => {
      fireEvent.click(component.getByTestId('mockPanelContent_1'), { detail: 1 });
    });
    expect(dashboardApi.selectedPanelIds$.value.has('1')).toBe(true);
  });

  test('a single plain click on the drag area selects the panel', async () => {
    const { component, dashboardApi } = await setup();
    await act(async () => {
      fireEvent.click(component.getByTestId('mockPanelHeader_1'), { detail: 1 });
    });

    expect(dashboardApi.selectedPanelIds$.value.has('1')).toBe(true);
  });

  test('a plain click on the inline-editable title does not select the panel', async () => {
    const { component, dashboardApi } = await setup();
    await act(async () => {
      fireEvent.click(component.getByTestId('mockPanelTitle_1'), { detail: 1 });
    });
    expect(dashboardApi.selectedPanelIds$.value.has('1')).toBe(false);
  });

  test('Cmd/Ctrl+click on the title still selects the panel', async () => {
    const { component, dashboardApi } = await setup();
    await act(async () => {
      fireEvent.click(component.getByTestId('mockPanelTitle_1'), {
        detail: 1,
        metaKey: true,
        ctrlKey: true,
      });
    });
    expect(dashboardApi.selectedPanelIds$.value.has('1')).toBe(true);
  });
});

describe('hint area', () => {
  test('is rendered in edit mode', async () => {
    const { component, dashboardApi } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });
    await act(async () => {
      dashboardApi.setViewMode('edit');
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(component.getByTestId('dashboardPanelHintArea-1')).toBeInTheDocument();
  });

  test('is not rendered in view mode', async () => {
    const { component, dashboardApi } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });
    await act(async () => {
      dashboardApi.setViewMode('view');
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(component.queryByTestId('dashboardPanelHintArea-1')).toBeNull();
  });

  test('is not rendered in select mode', async () => {
    const { component, dashboardApi } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });
    await act(async () => {
      dashboardApi.setViewMode('edit');
      dashboardApi.setSelectedPanelIds(new Set(['2']));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
    expect(component.queryByTestId('dashboardPanelHintArea-1')).toBeNull();
  });
});

describe('selection indicator', () => {
  const select = async (
    dashboardApi: { setSelectedPanelIds: (ids: Set<string>) => void },
    ids: string[]
  ) => {
    await act(async () => {
      dashboardApi.setSelectedPanelIds(new Set(ids));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
  };

  test('is hidden when no panel is selected', () => {
    const { component } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });
    expect(component.queryByTestId('dashboardPanelSelectionIndicator-1')).toBeNull();
  });

  test('shows an empty circle on unselected panels in select mode', async () => {
    const { component, dashboardApi } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });
    await select(dashboardApi, ['2']);

    const indicator = component.getByTestId('dashboardPanelSelectionIndicator-1');
    expect(indicator.classList).not.toContain('dshDashboardGrid__selectionIndicator--checked');
    expect(component.queryByText('Selected')).toBeNull();
  });

  test('shows a check on selected panels', async () => {
    const { component, dashboardApi } = createAndMountDashboardGridItem({
      id: '1',
      key: '1',
      type: TEST_EMBEDDABLE,
    });
    await select(dashboardApi, ['1']);

    const indicator = component.getByTestId('dashboardPanelSelectionIndicator-1');
    expect(indicator.classList).toContain('dshDashboardGrid__selectionIndicator--checked');
    expect(component.getByText('Selected')).toBeInTheDocument();
  });
});

describe('right-click menu', () => {
  // the grid item reads the selection through batched subjects, which update asynchronously
  const select = async (
    dashboardApi: { setSelectedPanelIds: (ids: Set<string>) => void },
    ids: string[]
  ) => {
    await act(async () => {
      dashboardApi.setSelectedPanelIds(new Set(ids));
      await new Promise((resolve) => setTimeout(resolve, 1));
    });
  };

  const rightClick = (element: Element) => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    act(() => {
      element.dispatchEvent(event);
    });
    return event;
  };

  test('keeps the browser menu when the panel is not selected', () => {
    const openContextMenu = jest.fn();
    const { component } = createAndMountDashboardGridItem(
      { id: '1', key: '1', type: TEST_EMBEDDABLE },
      openContextMenu
    );

    const event = rightClick(component.container.querySelector('#panel-1')!);
    expect(openContextMenu).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  test('keeps the browser menu when only other panels are selected', async () => {
    const openContextMenu = jest.fn();
    const { component, dashboardApi } = createAndMountDashboardGridItem(
      { id: '1', key: '1', type: TEST_EMBEDDABLE },
      openContextMenu
    );
    await select(dashboardApi, ['2']);

    rightClick(component.container.querySelector('#panel-1')!);
    expect(openContextMenu).not.toHaveBeenCalled();
  });

  test('opens the bulk actions menu on a selected panel', async () => {
    const openContextMenu = jest.fn();
    const { component, dashboardApi } = createAndMountDashboardGridItem(
      { id: '1', key: '1', type: TEST_EMBEDDABLE },
      openContextMenu
    );
    await select(dashboardApi, ['1', '2']);

    const event = rightClick(component.container.querySelector('#panel-1')!);
    expect(openContextMenu).toHaveBeenCalledWith('1', expect.any(Object));
    expect(event.defaultPrevented).toBe(true);
  });
});
