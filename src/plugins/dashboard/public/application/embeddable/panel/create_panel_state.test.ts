/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableInput } from '../../../services/embeddable';
import { CONTACT_CARD_EMBEDDABLE } from '@kbn/embeddable-plugin/public/lib/test_samples';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../dashboard_constants';
import { DashboardPanelState } from '../types';
import { createPanelState } from './create_panel_state';

interface TestInput extends EmbeddableInput {
  test: string;
}
const panels: { [key: string]: DashboardPanelState } = {};

test('createPanelState adds a new panel state in 0,0 position', () => {
  const { newPanel: panelState } = createPanelState<TestInput>(
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

test('createPanelState adds a second new panel state', () => {
  const { newPanel: panelState } = createPanelState<TestInput>(
    { type: CONTACT_CARD_EMBEDDABLE, explicitInput: { test: 'bye', id: '456' } },
    panels
  );

  expect(panelState.gridData.x).toBe(DEFAULT_PANEL_WIDTH);
  expect(panelState.gridData.y).toBe(0);
  expect(panelState.gridData.h).toBe(DEFAULT_PANEL_HEIGHT);
  expect(panelState.gridData.w).toBe(DEFAULT_PANEL_WIDTH);

  panels[panelState.explicitInput.id] = panelState;
});

test('createPanelState adds a third new panel state', () => {
  const { newPanel: panelState } = createPanelState<TestInput>(
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

test('createPanelState adds a new panel state in the top most position', () => {
  delete panels['456'];
  const { newPanel: panelState } = createPanelState<TestInput>(
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
});
