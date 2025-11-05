/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { buildMockDashboardApi } from '../../mocks';
import type { Props as DashboardGridItemProps } from './dashboard_grid_item';
import { Item } from './dashboard_grid_item';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../dashboard_api/use_dashboard_internal_api';
import { act, render } from '@testing-library/react';

jest.mock('@kbn/embeddable-plugin/public', () => {
  const original = jest.requireActual('@kbn/embeddable-plugin/public');

  return {
    ...original,
    ReactEmbeddableRenderer: (props: DashboardGridItemProps) => {
      return (
        <div className="embedPanel" id={`mockEmbedPanel_${props.id}`}>
          mockEmbeddablePanel
        </div>
      );
    },
  };
});

// Value of panel type does not effect test output
// since test mocks ReactEmbeddableRenderer to render static content regardless of embeddable type
const TEST_EMBEDDABLE = 'TEST_EMBEDDABLE';

const createAndMountDashboardGridItem = (props: DashboardGridItemProps) => {
  const panels = [
    {
      grid: { x: 0, y: 0, w: 6, h: 6, i: '1' },
      type: TEST_EMBEDDABLE,
      config: {},
      uid: '1',
    },
    {
      grid: { x: 6, y: 6, w: 6, h: 6, i: '2' },
      type: TEST_EMBEDDABLE,
      config: {},
      uid: '2',
    },
  ];
  const { api, internalApi } = buildMockDashboardApi({ overrides: { panels } });

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
