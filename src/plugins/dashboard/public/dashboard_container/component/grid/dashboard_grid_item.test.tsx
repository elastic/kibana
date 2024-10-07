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
import { CONTACT_CARD_EMBEDDABLE } from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';

import { buildMockDashboard } from '../../../mocks';
import { Item, Props as DashboardGridItemProps } from './dashboard_grid_item';
import { DashboardContext } from '../../../dashboard_api/use_dashboard_api';
import { DashboardApi } from '../../../dashboard_api/types';

jest.mock('@kbn/embeddable-plugin/public', () => {
  const original = jest.requireActual('@kbn/embeddable-plugin/public');

  return {
    ...original,
    EmbeddablePanel: (props: DashboardGridItemProps) => {
      return (
        <div className="embedPanel" id={`mockEmbedPanel_${props.id}`}>
          mockEmbeddablePanel
        </div>
      );
    },
  };
});

const createAndMountDashboardGridItem = (props: DashboardGridItemProps) => {
  const panels = {
    '1': {
      gridData: { x: 0, y: 0, w: 6, h: 6, i: '1' },
      type: CONTACT_CARD_EMBEDDABLE,
      explicitInput: { id: '1' },
    },
    '2': {
      gridData: { x: 6, y: 6, w: 6, h: 6, i: '2' },
      type: CONTACT_CARD_EMBEDDABLE,
      explicitInput: { id: '2' },
    },
  };
  const dashboardApi = buildMockDashboard({ overrides: { panels } }) as DashboardApi;

  const component = mountWithIntl(
    <DashboardContext.Provider value={dashboardApi}>
      <Item {...props} />
    </DashboardContext.Provider>
  );
  return { dashboardApi, component };
};

test('renders Item', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: CONTACT_CARD_EMBEDDABLE,
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
    type: CONTACT_CARD_EMBEDDABLE,
    expandedPanelId: '1',
  });
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--expanded')).toBe(true);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--hidden')).toBe(false);
});

test('renders hidden panel', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: CONTACT_CARD_EMBEDDABLE,
    expandedPanelId: '2',
  });
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--expanded')).toBe(false);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--hidden')).toBe(true);
});

test('renders focused panel', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: CONTACT_CARD_EMBEDDABLE,
    focusedPanelId: '1',
  });

  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--focused')).toBe(true);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--blurred')).toBe(false);
});

test('renders blurred panel', async () => {
  const { component } = createAndMountDashboardGridItem({
    id: '1',
    key: '1',
    type: CONTACT_CARD_EMBEDDABLE,
    focusedPanelId: '2',
  });

  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--focused')).toBe(false);
  expect(component.find('#panel-1').hasClass('dshDashboardGrid__item--blurred')).toBe(true);
});
