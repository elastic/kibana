/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { mountWithIntl } from '@kbn/test-jest-helpers';

import { buildMockDashboardApi } from '../../../mocks';
import { Item, Props as DashboardGridItemProps } from './dashboard_grid_item';
import { DashboardContext } from '../../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../../dashboard_api/use_dashboard_internal_api';

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
  const panels = {
    '1': {
      gridData: { x: 0, y: 0, w: 6, h: 6, i: '1' },
      type: TEST_EMBEDDABLE,
      explicitInput: { id: '1' },
    },
    '2': {
      gridData: { x: 6, y: 6, w: 6, h: 6, i: '2' },
      type: TEST_EMBEDDABLE,
      explicitInput: { id: '2' },
    },
  };
  const { api, internalApi } = buildMockDashboardApi({ overrides: { panels } });

  const component = mountWithIntl(
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
  const panelElements = component.find('.embedPanel');
  expect(panelElements.length).toBe(1);

  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--expanded')).toBe(false);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--hidden')).toBe(false);

  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--focused')).toBe(false);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--blurred')).toBe(false);
});

test('renders expanded panel', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
    expandedPanelId: '1',
  });
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--expanded')).toBe(true);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--hidden')).toBe(false);
});

test('renders hidden panel', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
    expandedPanelId: '2',
  });
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--expanded')).toBe(false);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--hidden')).toBe(true);
});

test('renders focused panel', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
    focusedPanelId: '1',
  });

  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--focused')).toBe(true);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--blurred')).toBe(false);
});

test('renders blurred panel', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: TEST_EMBEDDABLE,
    focusedPanelId: '2',
  });

  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--focused')).toBe(false);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--blurred')).toBe(true);
});
