/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isImportJsonValidationError } from '@kbn/as-code-import-flyout-component';
import type { DashboardApi } from '../dashboard_api/types';
import { addImportedPanels, sanitizeImportedPanels } from './import_panels';

const mockPost = jest.fn();
const mockGetEmbeddableDefinition = jest.fn();
const mockGetIdsWithTitle = jest.fn();
jest.mock('../services/kibana_services', () => ({
  coreServices: {
    http: { post: (...args: unknown[]) => mockPost(...args) },
  },
  embeddableService: {
    getEmbeddableDefinition: (...args: unknown[]) => mockGetEmbeddableDefinition(...args),
  },
  dataService: {
    dataViews: { getIdsWithTitle: (...args: unknown[]) => mockGetIdsWithTitle(...args) },
  },
}));

const grid = { x: 0, y: 0, w: 12, h: 8 };
const savedDataView = { type: 'index-pattern', type_label: 'Data view', id: 'logs-data-view' };

const dslChartOnSavedDataView = {
  type: 'vis',
  grid,
  config: {
    type: 'metric',
    title: 'Requests',
    data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
    metrics: [{ type: 'primary', operation: 'count' }],
  },
};
const dslChartOnAdHocDataView = {
  type: 'vis',
  grid,
  config: {
    type: 'xy',
    title: 'Log entries over time',
    layers: [
      {
        type: 'line',
        data_source: { type: 'data_view_spec', index_pattern: 'logs-*', time_field: '@timestamp' },
        x: { operation: 'date_histogram', field: '@timestamp' },
        y: [{ operation: 'count' }],
      },
    ],
  },
};
const esqlChart = {
  type: 'vis',
  grid,
  config: {
    type: 'data_table',
    title: 'Bytes by host',
    data_source: { type: 'esql', query: 'FROM logs-* | STATS bytes = SUM(bytes) BY host.name' },
    metrics: [{ column: 'bytes' }],
    rows: [{ column: 'host.name' }],
  },
};
const libraryChart = { type: 'vis', grid, config: { ref_id: 'library-chart' } };

// Answers like the sanitize route: it returns the panels with the related items they reference
const mockSanitizeRoute = ({
  relatedItems = [],
  warnings = [],
  dropPanels = false,
}: {
  relatedItems?: object[];
  warnings?: object[];
  dropPanels?: boolean;
} = {}) =>
  mockPost.mockImplementation(async (_path: string, { body }: { body: string }) => {
    const { title, panels } = JSON.parse(body);
    return {
      data: { title, panels: dropPanels ? [] : panels },
      warnings,
      ...(relatedItems.length
        ? { related_items: relatedItems, related_items_count: relatedItems.length }
        : {}),
    };
  });

const getValidationError = async (raw: unknown) => {
  try {
    await sanitizeImportedPanels(raw);
  } catch (error) {
    if (isImportJsonValidationError(error)) return error.message;
    throw error;
  }
  throw new Error('Expected a validation error');
};

describe('sanitizeImportedPanels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmbeddableDefinition.mockResolvedValue({ type: 'vis' });
    mockGetIdsWithTitle.mockResolvedValue([]);
  });

  it('flags the saved data view of a chart when it does not exist in this space', async () => {
    mockSanitizeRoute({ relatedItems: [savedDataView] });

    const result = await sanitizeImportedPanels(dslChartOnSavedDataView);

    expect(result.data.panels).toEqual([dslChartOnSavedDataView]);
    expect(result.relatedItems).toEqual([{ ...savedDataView, isMissing: true }]);
    expect(result.relatedItemsCount).toBe(1);
  });

  it('does not flag the saved data view of a chart when it exists in this space', async () => {
    mockSanitizeRoute({ relatedItems: [savedDataView] });
    mockGetIdsWithTitle.mockResolvedValue([{ id: 'logs-data-view', title: 'logs-*' }]);

    const result = await sanitizeImportedPanels(dslChartOnSavedDataView);

    expect(result.relatedItems).toEqual([{ ...savedDataView, isMissing: false }]);
  });

  it.each([
    ['an ad hoc data view', dslChartOnAdHocDataView],
    ['ES|QL', esqlChart],
  ])('adds a chart on %s without related items', async (_name, panel) => {
    mockSanitizeRoute();

    const result = await sanitizeImportedPanels(panel);

    expect(result.data.panels).toEqual([panel]);
    expect(result.relatedItems).toEqual([]);
    expect(mockGetIdsWithTitle).not.toHaveBeenCalled();
  });

  it('keeps library-linked panels as references to the library item', async () => {
    const libraryItem = { type: 'lens', type_label: 'Visualization', id: 'library-chart' };
    mockSanitizeRoute({ relatedItems: [libraryItem] });

    const result = await sanitizeImportedPanels(libraryChart);

    expect(result.data.panels).toEqual([libraryChart]);
    expect(result.relatedItems).toEqual([libraryItem]);
  });

  it('returns the messages of the properties the sanitize route removed', async () => {
    mockSanitizeRoute({
      warnings: [
        { type: 'dropped_property', message: 'Removed "legacy_setting"', key: 'legacy_setting' },
      ],
    });

    const result = await sanitizeImportedPanels(esqlChart);

    expect(result.warnings).toEqual(['Removed "legacy_setting"']);
  });

  it('rejects panel types that are not available in this deployment', async () => {
    mockGetEmbeddableDefinition.mockResolvedValue(undefined);

    expect(await getValidationError({ ...esqlChart, type: 'unknown_panel' })).toBe(
      'Panels of type "unknown_panel" aren’t available in this deployment.'
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects panels that the Dashboards API does not support', async () => {
    mockSanitizeRoute({
      dropPanels: true,
      warnings: [
        {
          type: 'dropped_panel',
          message: 'Lens "lnsChoropleth" chart type is not supported',
          panel_type: 'vis',
          panel_config: {},
        },
      ],
    });

    expect(await getValidationError(dslChartOnSavedDataView)).toBe(
      'This panel can’t be added: Lens "lnsChoropleth" chart type is not supported'
    );
  });
});

describe('addImportedPanels', () => {
  it('adds the panel at its original size and returns its id and title', () => {
    const addIncomingEmbeddables = jest.fn();
    const dashboardApi = { addIncomingEmbeddables } as unknown as Pick<
      DashboardApi,
      'addIncomingEmbeddables'
    >;

    const result = addImportedPanels(dashboardApi, { panels: [dslChartOnSavedDataView] });

    expect(addIncomingEmbeddables).toHaveBeenCalledWith([
      {
        embeddableId: result.id,
        type: 'vis',
        serializedState: dslChartOnSavedDataView.config,
        size: { width: 12, height: 8 },
      },
    ]);
    expect(result.title).toBe('Requests');
  });
});
