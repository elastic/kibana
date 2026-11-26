/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import { VIEW_MODE } from '@kbn/discover-session-constants';
import { discoverSessionApiClassicTabBaseSchema, discoverSessionApiEsqlTabBaseSchema } from './tab';

const classicTabInput = {
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'logs-data-view',
  },
};

const esqlTabInput = {
  data_source: {
    type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
    query: 'FROM logs-* | LIMIT 10',
  },
};

describe('discoverSessionApiClassicTabBaseSchema', () => {
  it('validates a data view reference tab and applies defaults', () => {
    const validated = discoverSessionApiClassicTabBaseSchema.parse(classicTabInput);

    expect(validated.data_source.type).toBe(AS_CODE_DATA_VIEW_REFERENCE_TYPE);
    expect(validated.filters).toEqual([]);
    expect(validated.sort).toEqual([]);
    expect(validated.view_mode).toBe(VIEW_MODE.DOCUMENT_LEVEL);
  });

  it('validates query and filters using as-code schemas', () => {
    const validated = discoverSessionApiClassicTabBaseSchema.parse({
      ...classicTabInput,
      query: {
        expression: 'status:200',
        language: 'kql',
      },
      filters: [
        {
          type: 'condition',
          condition: {
            field: 'host.name',
            operator: 'is',
            value: 'web-01',
          },
        },
      ],
    });

    expect(validated.query).toEqual({
      expression: 'status:200',
      language: 'kql',
    });
    expect(validated.filters).toHaveLength(1);
  });

  it('rejects an invalid data source type', () => {
    expect(() =>
      discoverSessionApiClassicTabBaseSchema.parse({
        ...classicTabInput,
        data_source: {
          type: 'invalid_type',
          ref_id: 'logs-data-view',
        },
      })
    ).toThrow();
  });

  it('rejects an invalid view mode', () => {
    expect(() =>
      discoverSessionApiClassicTabBaseSchema.parse({
        ...classicTabInput,
        view_mode: 'invalid_mode',
      })
    ).toThrow();
  });

  it('rejects an invalid sort direction', () => {
    expect(() =>
      discoverSessionApiClassicTabBaseSchema.parse({
        ...classicTabInput,
        sort: [{ name: '@timestamp', direction: 'sideways' }],
      })
    ).toThrow();
  });
});

describe('discoverSessionApiEsqlTabBaseSchema', () => {
  it('validates an ES|QL data source tab and applies data table defaults', () => {
    const validated = discoverSessionApiEsqlTabBaseSchema.parse(esqlTabInput);

    expect(validated.data_source.type).toBe(AS_CODE_ESQL_DATA_SOURCE_TYPE);
    expect(validated.data_source.query).toBe('FROM logs-* | LIMIT 10');
    expect(validated.sort).toEqual([]);
  });

  it('rejects a nested data_source shape', () => {
    expect(() =>
      discoverSessionApiEsqlTabBaseSchema.parse({
        data_source: {
          data_view: {
            ref_id: 'logs-data-view',
          },
        },
      })
    ).toThrow();
  });

  it('rejects a classic data view reference used as an ES|QL tab', () => {
    expect(() => discoverSessionApiEsqlTabBaseSchema.parse(classicTabInput)).toThrow();
  });

  it('accepts data table limits on ES|QL tabs', () => {
    const validated = discoverSessionApiEsqlTabBaseSchema.parse({
      ...esqlTabInput,
      rows_per_page: 25,
      sample_size: 500,
    });

    expect(validated.rows_per_page).toBe(25);
    expect(validated.sample_size).toBe(500);
  });
});
