/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isImportJsonValidationError } from '@kbn/as-code-import-flyout-component';
import { sanitizeImportedPanels } from './import_panels';

const mockPost = jest.fn();
const mockGetEmbeddableDefinition = jest.fn();
jest.mock('../services/kibana_services', () => ({
  coreServices: {
    http: { post: (...args: unknown[]) => mockPost(...args) },
  },
  embeddableService: {
    getEmbeddableDefinition: (...args: unknown[]) => mockGetEmbeddableDefinition(...args),
  },
}));

const grid = { x: 0, y: 0, w: 12, h: 8 };

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

// Answers like the sanitize route: it returns the panels it kept and its warnings
const mockSanitizeRoute = ({
  warnings = [],
  dropPanels = false,
}: {
  warnings?: object[];
  dropPanels?: boolean;
} = {}) =>
  mockPost.mockImplementation(async (_path: string, { body }: { body: string }) => {
    const { title, panels } = JSON.parse(body);
    return { data: { title, panels: dropPanels ? [] : panels }, warnings };
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

    expect(await getValidationError(esqlChart)).toBe(
      'This panel can’t be added: Lens "lnsChoropleth" chart type is not supported'
    );
  });
});
