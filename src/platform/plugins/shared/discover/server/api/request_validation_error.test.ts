/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import { discoverSessionApiDataSchema } from '@kbn/as-code-discover-schema';
import { httpServerMock } from '@kbn/core/server/mocks';
import { discoverSessionInternalDataSchema } from './internal_schema';
import { onRequestValidationError } from './request_validation_error';

const classicTab = {
  id: 'tab-classic',
  label: 'Logs',
  data_source: { type: 'data_view_reference', ref_id: 'logs-data-view' },
};

const esqlTab = {
  id: 'tab-esql',
  label: 'ES|QL',
  data_source: { type: 'esql', query: 'FROM logs' },
};

const respondTo = (data: object, schema: z.ZodType = discoverSessionApiDataSchema) => {
  const result = schema.safeParse(data);
  if (result.success) throw new Error('Expected the session to be invalid');

  const response = httpServerMock.createResponseFactory();
  onRequestValidationError(
    { message: 'raw', source: 'body', rawError: result.error },
    httpServerMock.createKibanaRequest(),
    response
  );

  return { response, issues: result.error.issues };
};

describe('onRequestValidationError', () => {
  it('reports only the errors of the branch selected by each tab discriminators', () => {
    const { response, issues } = respondTo({
      title: 'Session',
      tabs: [
        { ...classicTab, id: undefined, row_height: true },
        {
          ...esqlTab,
          data_source: { type: 'esql' },
          control_panels: [{ id: 'panel-1', type: 'nope', config: {} }],
        },
      ],
    });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: [
          'Tab 1, id: Invalid input: expected string, received undefined',
          'Tab 1, row_height: Invalid input',
          'Tab 2, data_source, query: Invalid input: expected string, received undefined',
          'Tab 2, control 1, type: Invalid input: expected "esql_control"',
          "Tab 2, control 1, config, control_type: Invalid discriminator value. Expected 'STATIC_VALUES' | 'VALUES_FROM_QUERY'",
        ].join('\n'),
        attributes: { issues },
      },
    });
  });

  it('selects the metrics branch from the tab type and lists every error', () => {
    const { response } = respondTo({
      title: 'Session',
      tabs: [{ ...esqlTab, type: 'metrics', foo: true }],
    });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: expect.objectContaining({
        message: [
          'Tab 1, dimensions: Invalid input: expected array, received undefined',
          'Tab 1, search_term: Invalid input: expected string, received undefined',
          'Tab 1, counter_aggregation: Invalid option: expected one of "avg"|"sum"|"min"|"max"',
          'Tab 1, gauge_aggregation: Invalid option: expected one of "avg"|"sum"|"min"|"max"',
          'Tab 1, histogram_percentile: Invalid option: expected one of "p50"|"p75"|"p90"|"p95"|"p99"',
          'Tab 1: Unrecognized key: "foo"',
        ].join('\n'),
      }),
    });
  });

  it('reports the whole tab when no branch matches its discriminators', () => {
    const { response, issues } = respondTo({
      title: 'Session',
      tabs: [{ ...classicTab, data_source: { type: 'nope' } }],
    });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: {
        message: 'Tab 1: Invalid tab configuration. Check the tab type, data source, and settings.',
        attributes: { issues },
      },
    });
  });

  it('selects the tab branch with the internal session schema', () => {
    const { response } = respondTo(
      { title: 'Session', tabs: [{ ...esqlTab, data_source: { type: 'esql' } }] },
      discoverSessionInternalDataSchema
    );

    expect(response.badRequest).toHaveBeenCalledWith({
      body: expect.objectContaining({
        message: 'Tab 1, data_source, query: Invalid input: expected string, received undefined',
      }),
    });
  });

  it('reports errors without a field path as they are', () => {
    const { response } = respondTo({ title: 'Session', tabs: [classicTab], unexpected: true });

    expect(response.badRequest).toHaveBeenCalledWith({
      body: expect.objectContaining({ message: 'Unrecognized key: "unexpected"' }),
    });
  });

  it('keeps the router message for non-Zod errors', () => {
    const response = httpServerMock.createResponseFactory();

    onRequestValidationError(
      { message: '[request body]: Invalid request', source: 'body', rawError: new Error() },
      httpServerMock.createKibanaRequest(),
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: '[request body]: Invalid request' },
    });
  });
});
