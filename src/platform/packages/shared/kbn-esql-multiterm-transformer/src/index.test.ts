/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformEsqlMultiTermBreakdown, isMultiTermColumn } from '.';
import type { Datatable } from '@kbn/expressions-plugin/common';

describe('transformEsqlMultiTermBreakdown', () => {
  const statsQuery = 'TS my_index | STATS a BY b, c, d';

  it('should not transform the datatable if it has less than 3 columns', () => {
    const datatable: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'date', name: '@timestamp', meta: { type: 'date' } },
        { id: 'metric', name: 'AVG(bytes)', meta: { type: 'number' } },
      ],
      rows: [{ date: 1, metric: 100 }],
    };
    const result = transformEsqlMultiTermBreakdown({ ...datatable, query: statsQuery });
    expect(result.transformed).toBe(false);
    expect(result.columns).toEqual(datatable.columns);
    expect(result.rows).toEqual(datatable.rows);
  });

  it('should not transform the datatable if it does not match the shape', () => {
    const datatable: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'date', name: '@timestamp', meta: { type: 'date' } },
        { id: 'metric1', name: 'AVG(bytes)', meta: { type: 'number' } },
        { id: 'metric2', name: 'MAX(bytes)', meta: { type: 'number' } },
      ],
      rows: [{ date: 1, metric1: 100, metric2: 200 }],
    };
    const result = transformEsqlMultiTermBreakdown({ ...datatable, query: statsQuery });
    expect(result.transformed).toBe(false);
    expect(result.columns).toEqual(datatable.columns);
    expect(result.rows).toEqual(datatable.rows);
  });

  it('should not transform the datatable if the query does not have a STATS command', () => {
    const datatable: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'date', name: '@timestamp', meta: { type: 'date' } },
        { id: 'metric', name: 'AVG(bytes)', meta: { type: 'number' } },
        { id: 'host', name: 'host.name', meta: { type: 'string' } },
        { id: 'region', name: 'region', meta: { type: 'string' } },
      ],
      rows: [{ date: 1, metric: 100, host: 'host-a', region: 'us-east-1' }],
    };
    const result = transformEsqlMultiTermBreakdown({ ...datatable, query: 'TS my_index' });
    expect(result.transformed).toBe(false);
  });

  it('should not transform the datatable if the query does not have a TS command', () => {
    const datatable: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'date', name: '@timestamp', meta: { type: 'date' } },
        { id: 'metric', name: 'AVG(bytes)', meta: { type: 'number' } },
        { id: 'host', name: 'host.name', meta: { type: 'string' } },
        { id: 'region', name: 'region', meta: { type: 'string' } },
      ],
      rows: [{ date: 1, metric: 100, host: 'host-a', region: 'us-east-1' }],
    };
    const result = transformEsqlMultiTermBreakdown({
      ...datatable,
      query: 'FROM my_index | STATS a BY b, c, d',
    });
    expect(result.transformed).toBe(false);
  });

  it('should transform the datatable if it matches the shape', () => {
    const datatable: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'date', name: '@timestamp', meta: { type: 'date' } },
        { id: 'metric', name: 'AVG(bytes)', meta: { type: 'number' } },
        { id: 'host', name: 'host.name', meta: { type: 'string' } },
        { id: 'region', name: 'region', meta: { type: 'string' } },
      ],
      rows: [
        { date: 1, metric: 100, host: 'host-a', region: 'us-east-1' },
        { date: 2, metric: 200, host: 'host-b', region: 'us-west-2' },
        { date: 3, metric: 300, host: 'host-c', region: null },
      ],
    };
    const result = transformEsqlMultiTermBreakdown({ ...datatable, query: statsQuery });
    expect(result.transformed).toBe(true);
    expect(result.newColumnName).toBe('host.name › region');
    expect(result.originalStringColumns).toEqual([
      { id: 'host', name: 'host.name', meta: { type: 'string' } },
      { id: 'region', name: 'region', meta: { type: 'string' } },
    ]);
    expect(result.columns).toHaveLength(3);
    expect(result.columns[2].name).toBe('host.name › region');
    expect(result.rows).toEqual([
      {
        date: 1,
        metric: 100,
        host: 'host-a',
        region: 'us-east-1',
        'host.name › region': 'host-a › us-east-1',
      },
      {
        date: 2,
        metric: 200,
        host: 'host-b',
        region: 'us-west-2',
        'host.name › region': 'host-b › us-west-2',
      },
      {
        date: 3,
        metric: 300,
        host: 'host-c',
        region: null,
        'host.name › region': 'host-c › __missing__',
      },
    ]);
  });

  it('should handle three string columns', () => {
    const datatable: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'date', name: '@timestamp', meta: { type: 'date' } },
        { id: 'metric', name: 'AVG(bytes)', meta: { type: 'number' } },
        { id: 'host', name: 'host.name', meta: { type: 'string' } },
        { id: 'region', name: 'region', meta: { type: 'string' } },
        { id: 'cloud', name: 'cloud.provider', meta: { type: 'string' } },
      ],
      rows: [{ date: 1, metric: 100, host: 'host-a', region: 'us-east-1', cloud: 'aws' }],
    };
    const result = transformEsqlMultiTermBreakdown({ ...datatable, query: statsQuery });
    expect(result.transformed).toBe(true);
    expect(result.newColumnName).toBe('host.name › region › cloud.provider');
    expect(result.columns).toHaveLength(3);
    expect(result.columns[2].name).toBe('host.name › region › cloud.provider');
    expect(result.rows).toEqual([
      {
        date: 1,
        metric: 100,
        host: 'host-a',
        region: 'us-east-1',
        cloud: 'aws',
        'host.name › region › cloud.provider': 'host-a › us-east-1 › aws',
      },
    ]);
    const { meta } = result.columns[2];
    expect(isMultiTermColumn({ meta } as any)).toBe(true);
    if (isMultiTermColumn({ meta } as any)) {
      expect(meta.originalValueLookup.get('host-a › us-east-1 › aws')).toEqual({
        host: 'host-a',
        region: 'us-east-1',
        cloud: 'aws',
      });
    }
  });
});
