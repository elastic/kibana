/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sanitizePanels } from './sanitize_panels';

const mockPost = jest.fn();
jest.mock('../services/kibana_services', () => ({
  coreServices: {
    http: { post: (...args: unknown[]) => mockPost(...args) },
  },
}));

const grid = { x: 0, y: 0, w: 24, h: 15 };
const markdownPanel = { type: 'markdown', grid, config: { content: '# Notes' } };
const lensPanel = {
  type: 'vis',
  grid,
  config: {
    type: 'metric',
    data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
    metrics: [{ type: 'primary', operation: 'count' }],
  },
};

describe('sanitizePanels', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('sanitizes the panels as one dashboard and returns them in their original order', async () => {
    mockPost.mockResolvedValue({
      data: {
        title: 'Panels to sanitize',
        panels: [
          { ...lensPanel, id: '1' },
          { ...markdownPanel, id: '0' },
        ],
      },
      related_items: [{ type: 'index-pattern', type_label: 'Data view', id: 'logs-data-view' }],
      related_items_count: 1,
    });
    const signal = new AbortController().signal;

    const result = await sanitizePanels([markdownPanel, lensPanel], signal);

    expect(mockPost).toHaveBeenCalledWith('/internal/dashboards/_sanitize', {
      version: '1',
      body: JSON.stringify({
        title: 'Panels to sanitize',
        panels: [
          { ...markdownPanel, id: '0' },
          { ...lensPanel, id: '1' },
        ],
      }),
      signal,
    });
    expect(result).toEqual({
      panels: [markdownPanel, lensPanel],
      warnings: [],
      relatedItems: [{ type: 'index-pattern', type_label: 'Data view', id: 'logs-data-view' }],
      relatedItemsCount: 1,
    });
  });

  it('returns undefined for the panels that the sanitize route dropped', async () => {
    const droppedPanelWarning = {
      type: 'dropped_panel',
      message: 'Lens "lnsChoropleth" chart type is not supported',
      panel_type: 'vis',
      panel_config: {},
    };
    mockPost.mockResolvedValue({
      data: { title: 'Panels to sanitize', panels: [{ ...markdownPanel, id: '1' }] },
      warnings: [droppedPanelWarning],
    });

    const result = await sanitizePanels([lensPanel, markdownPanel]);

    expect(result.panels).toEqual([undefined, markdownPanel]);
    expect(result.warnings).toEqual([droppedPanelWarning]);
    expect(result.relatedItemsCount).toBe(0);
  });
});
