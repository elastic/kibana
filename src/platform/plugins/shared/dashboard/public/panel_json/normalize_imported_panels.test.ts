/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isImportJsonValidationError } from '@kbn/as-code-import-flyout-component';
import { alignPanelsToTop, normalizeImportedPanels } from './normalize_imported_panels';

const lensConfig = {
  type: 'metric',
  title: 'Requests',
  data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
  metrics: [{ type: 'primary', operation: 'count' }],
};

const lensPanel = { type: 'vis', grid: { x: 24, y: 0, w: 12, h: 8 }, config: lensConfig };

const getValidationError = (raw: unknown) => {
  try {
    normalizeImportedPanels(raw);
  } catch (error) {
    if (isImportJsonValidationError(error)) return error.message;
    throw error;
  }
  throw new Error('Expected a validation error');
};

describe('normalizeImportedPanels', () => {
  it('reads a panel entry exported from a panel menu', () => {
    expect(normalizeImportedPanels(lensPanel)).toEqual([lensPanel]);
  });

  it('moves the panel to the first row and keeps its column and size', () => {
    expect(normalizeImportedPanels({ ...lensPanel, grid: { x: 24, y: 30, w: 12, h: 8 } })).toEqual([
      lensPanel,
    ]);
  });

  it('ignores the panel id and properties that are not part of a panel entry', () => {
    expect(normalizeImportedPanels({ ...lensPanel, id: 'source-panel-id', extra: true })).toEqual([
      lensPanel,
    ]);
  });

  it('uses the default size when the grid is missing or invalid', () => {
    expect(normalizeImportedPanels({ type: 'markdown', config: { content: '# Notes' } })).toEqual([
      { type: 'markdown', grid: { x: 0, y: 0, w: 24, h: 15 }, config: { content: '# Notes' } },
    ]);
    expect(
      normalizeImportedPanels({ ...lensPanel, grid: { x: 'left', y: -4, w: 'wide', h: 0 } })
    ).toEqual([{ ...lensPanel, grid: { x: 0, y: 0, w: 24, h: 1 } }]);
  });

  it('keeps panels inside the 48 column grid', () => {
    expect(normalizeImportedPanels({ ...lensPanel, grid: { x: 40, y: 0, w: 80, h: 10 } })).toEqual([
      { ...lensPanel, grid: { x: 0, y: 0, w: 48, h: 10 } },
    ]);
    expect(normalizeImportedPanels({ ...lensPanel, grid: { x: 40, y: 0, w: 24, h: 10 } })).toEqual([
      { ...lensPanel, grid: { x: 24, y: 0, w: 24, h: 10 } },
    ]);
  });

  it('reads the only panel of a dashboard export, including panels in sections', () => {
    expect(
      normalizeImportedPanels({
        title: 'Source dashboard',
        panels: [{ title: 'Section', collapsed: false, grid: { y: 0 }, panels: [lensPanel] }],
        pinned_panels: [{ type: 'options_list_control', config: {} }],
      })
    ).toEqual([lensPanel]);
  });

  it('reads an array with a single panel entry', () => {
    expect(normalizeImportedPanels([lensPanel])).toEqual([lensPanel]);
  });

  it('rejects values that are not panel entries', () => {
    expect(getValidationError('a string')).toMatch(/doesn’t describe a dashboard panel/);
    expect(getValidationError(null)).toMatch(/doesn’t describe a dashboard panel/);
    expect(getValidationError({ type: 'vis', config: 'not an object' })).toMatch(
      /doesn’t describe a dashboard panel/
    );
  });

  it('rejects JSON without panels', () => {
    expect(getValidationError({ title: 'Empty dashboard', panels: [] })).toBe(
      'The JSON doesn’t contain any panels.'
    );
    expect(getValidationError([])).toBe('The JSON doesn’t contain any panels.');
  });

  it('keeps the arrangement of several panels when moving them to the first row', () => {
    expect(
      alignPanelsToTop([
        { type: 'vis', grid: { x: 0, y: 20, w: 24, h: 10 }, config: {} },
        { type: 'vis', grid: { x: 24, y: 25, w: 24, h: 10 }, config: {} },
      ]).map(({ grid }) => grid)
    ).toEqual([
      { x: 0, y: 0, w: 24, h: 10 },
      { x: 24, y: 5, w: 24, h: 10 },
    ]);
  });

  it('rejects more panels than can be added at a time', () => {
    expect(getValidationError(Array.from({ length: 101 }, () => lensPanel))).toBe(
      'The JSON contains 101 panels. You can add up to 100 panels at a time.'
    );
  });
});
