/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardPanelState } from '../../../common';
import { EmbeddableFactory, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { CONTACT_CARD_EMBEDDABLE } from '@kbn/embeddable-plugin/public/lib/test_samples';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../../dashboard_constants';

import { placePanel } from './place_panel';
import { IProvidesLegacyPanelPlacementSettings } from './types';

interface TestInput extends EmbeddableInput {
  test: string;
}
const panels: { [key: string]: DashboardPanelState } = {};

test('adds a new panel state in 0,0 position', () => {
  const { newPanel: panelState } = placePanel<TestInput>(
    {} as unknown as EmbeddableFactory,
    {
      type: CONTACT_CARD_EMBEDDABLE,
      explicitInput: { test: 'hi', id: '123' },
    },
    panels
  );
  expect(panelState.explicitInput.test).toBe('hi');
  expect(panelState.type).toBe(CONTACT_CARD_EMBEDDABLE);
  expect(panelState.explicitInput.id).toBeDefined();
  expect(panelState.gridData.x).toBe(0);
  expect(panelState.gridData.y).toBe(0);
  expect(panelState.gridData.h).toBe(DEFAULT_PANEL_HEIGHT);
  expect(panelState.gridData.w).toBe(DEFAULT_PANEL_WIDTH);

  panels[panelState.explicitInput.id] = panelState;
});

test('adds a second new panel state', () => {
  const { newPanel: panelState } = placePanel<TestInput>(
    {} as unknown as EmbeddableFactory,
    { type: CONTACT_CARD_EMBEDDABLE, explicitInput: { test: 'bye', id: '456' } },
    panels
  );

  expect(panelState.gridData.x).toBe(DEFAULT_PANEL_WIDTH);
  expect(panelState.gridData.y).toBe(0);
  expect(panelState.gridData.h).toBe(DEFAULT_PANEL_HEIGHT);
  expect(panelState.gridData.w).toBe(DEFAULT_PANEL_WIDTH);

  panels[panelState.explicitInput.id] = panelState;
});

test('adds a third new panel state', () => {
  const { newPanel: panelState } = placePanel<TestInput>(
    {} as unknown as EmbeddableFactory,
    {
      type: CONTACT_CARD_EMBEDDABLE,
      explicitInput: { test: 'bye', id: '789' },
    },
    panels
  );
  expect(panelState.gridData.x).toBe(0);
  expect(panelState.gridData.y).toBe(DEFAULT_PANEL_HEIGHT);
  expect(panelState.gridData.h).toBe(DEFAULT_PANEL_HEIGHT);
  expect(panelState.gridData.w).toBe(DEFAULT_PANEL_WIDTH);

  panels[panelState.explicitInput.id] = panelState;
});

test('adds a new panel state in the top most position when it is open', () => {
  // deleting panel 456 means that the top leftmost open position will be at the top of the Dashboard.
  delete panels['456'];
  const { newPanel: panelState } = placePanel<TestInput>(
    {} as unknown as EmbeddableFactory,
    {
      type: CONTACT_CARD_EMBEDDABLE,
      explicitInput: { test: 'bye', id: '987' },
    },
    panels
  );
  expect(panelState.gridData.x).toBe(DEFAULT_PANEL_WIDTH);
  expect(panelState.gridData.y).toBe(0);
  expect(panelState.gridData.h).toBe(DEFAULT_PANEL_HEIGHT);
  expect(panelState.gridData.w).toBe(DEFAULT_PANEL_WIDTH);

  // replace the topmost panel.
  panels[panelState.explicitInput.id] = panelState;
});

test('adds a new panel state at the very top of the Dashboard with default sizing', () => {
  const embeddableFactoryStub: IProvidesLegacyPanelPlacementSettings = {
    getLegacyPanelPlacementSettings: jest.fn().mockImplementation(() => {
      return { strategy: 'placeAtTop' };
    }),
  };

  const { newPanel: panelState } = placePanel<TestInput>(
    embeddableFactoryStub as unknown as EmbeddableFactory,
    {
      type: CONTACT_CARD_EMBEDDABLE,
      explicitInput: { test: 'wowee', id: '9001' },
    },
    panels
  );
  expect(panelState.gridData.x).toBe(0);
  expect(panelState.gridData.y).toBe(0);
  expect(panelState.gridData.h).toBe(DEFAULT_PANEL_HEIGHT);
  expect(panelState.gridData.w).toBe(DEFAULT_PANEL_WIDTH);

  expect(embeddableFactoryStub.getLegacyPanelPlacementSettings).toHaveBeenCalledWith(
    { id: '9001', test: 'wowee' },
    undefined
  );
});

test('adds a new panel state at the very top of the Dashboard with custom sizing', () => {
  const embeddableFactoryStub: IProvidesLegacyPanelPlacementSettings = {
    getLegacyPanelPlacementSettings: jest.fn().mockImplementation(() => {
      return { strategy: 'placeAtTop', width: 10, height: 5 };
    }),
  };

  const { newPanel: panelState } = placePanel<TestInput>(
    embeddableFactoryStub as unknown as EmbeddableFactory,
    {
      type: CONTACT_CARD_EMBEDDABLE,
      explicitInput: { test: 'woweee', id: '9002' },
    },
    panels
  );
  expect(panelState.gridData.x).toBe(0);
  expect(panelState.gridData.y).toBe(0);
  expect(panelState.gridData.h).toBe(5);
  expect(panelState.gridData.w).toBe(10);

  expect(embeddableFactoryStub.getLegacyPanelPlacementSettings).toHaveBeenCalledWith(
    { id: '9002', test: 'woweee' },
    undefined
  );
});

test('passes through given attributes', () => {
  const embeddableFactoryStub: IProvidesLegacyPanelPlacementSettings = {
    getLegacyPanelPlacementSettings: jest.fn().mockImplementation(() => {
      return { strategy: 'placeAtTop', width: 10, height: 5 };
    }),
  };

  placePanel<TestInput>(
    embeddableFactoryStub as unknown as EmbeddableFactory,
    {
      type: CONTACT_CARD_EMBEDDABLE,
      explicitInput: { test: 'wow', id: '9004' },
    },
    panels,
    { testAttr: 'hello' }
  );

  expect(embeddableFactoryStub.getLegacyPanelPlacementSettings).toHaveBeenCalledWith(
    { id: '9004', test: 'wow' },
    { testAttr: 'hello' }
  );
});
