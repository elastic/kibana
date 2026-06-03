/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedDashboardPanel } from '../../../dashboard_saved_object';
import { panelBwc, transformPanelReferencesOut } from './panel_bwc';

describe('transformPanelReferencesOut', () => {
  test('Should transform panelRefName reference name', () => {
    const containerReferences = [
      {
        name: 'panel_0',
        id: '1234',
        type: 'links',
      },
    ];
    expect(transformPanelReferencesOut(containerReferences, 'panel_0')).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1234",
          "name": "savedObjectRef",
          "type": "links",
        },
      ]
    `);
  });
});

describe('panelBwc', () => {
  const gridData = { x: 0, y: 0, w: 24, h: 15, i: 'panel-1' };

  test('strips a stale inline savedObjectId when a by-reference reference exists', () => {
    const panel = {
      type: 'search',
      panelRefName: 'panel_panel-1',
      panelIndex: 'panel-1',
      gridData,
      embeddableConfig: { savedObjectId: 'stale-source-space-id', description: '' },
    } as unknown as SavedDashboardPanel;
    const panelReferences = [
      { name: 'panel_panel-1', type: 'search', id: 'remapped-id' },
    ];

    const { panel: result, panelReferences: resultReferences } = panelBwc(panel, panelReferences);

    expect(result.embeddableConfig).not.toHaveProperty('savedObjectId');
    expect(result.embeddableConfig).toEqual({ description: '' });
    expect(result.type).toBe('discover_session');
    expect(resultReferences).toEqual([{ name: 'savedObjectRef', type: 'search', id: 'remapped-id' }]);
  });

  test('keeps inline savedObjectId when there is no by-reference reference', () => {
    const panel = {
      type: 'search',
      panelIndex: 'panel-1',
      gridData,
      embeddableConfig: { savedObjectId: 'inline-id', description: '' },
    } as unknown as SavedDashboardPanel;

    const { panel: result } = panelBwc(panel, []);

    expect(result.embeddableConfig).toHaveProperty('savedObjectId', 'inline-id');
  });

  test('does not strip savedObjectId for non by-reference reference types', () => {
    const panel = {
      type: 'search',
      panelRefName: 'panel_panel-1',
      panelIndex: 'panel-1',
      gridData,
      embeddableConfig: { savedObjectId: 'inline-id' },
    } as unknown as SavedDashboardPanel;
    const panelReferences = [{ name: 'panel_panel-1', type: 'index-pattern', id: 'dv-1' }];

    const { panel: result } = panelBwc(panel, panelReferences);

    expect(result.embeddableConfig).toHaveProperty('savedObjectId', 'inline-id');
  });
});
