/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { synth } from '../../../..';
import { columnsAfter } from './columns_after';

describe('PROMQL columnsAfter', () => {
  it('returns fields from the source', async () => {
    const sourceFields: ESQLFieldWithMetadata[] = [
      { name: 'bytes', type: 'double', userDefined: false },
      { name: 'agent', type: 'keyword', userDefined: false },
    ];

    const result = await columnsAfter(
      synth.cmd`PROMQL index=metrics rate(http_requests_total[5m])`,
      [],
      '',
      {
        fromFrom: () => Promise.resolve(sourceFields),
        fromJoin: () => Promise.resolve([]),
        fromEnrich: () => Promise.resolve([]),
      }
    );

    expect(result).toEqual(sourceFields);
  });

  it('returns source columns plus the assigned column name', async () => {
    const sourceFields: ESQLFieldWithMetadata[] = [
      { name: 'bytes', type: 'double', userDefined: false },
      { name: 'agent', type: 'keyword', userDefined: false },
    ];

    const result = await columnsAfter(
      synth.cmd`PROMQL index=metrics col0=(rate(http_requests_total[5m]))`,
      [],
      '',
      {
        fromFrom: () => Promise.resolve(sourceFields),
        fromJoin: () => Promise.resolve([]),
        fromEnrich: () => Promise.resolve([]),
      }
    );

    expect(result.map(({ name }) => name)).toEqual(['bytes', 'agent', 'col0']);
  });

  it('returns empty when no index param is present', async () => {
    const result = await columnsAfter(synth.cmd`PROMQL rate(http_requests_total[5m])`, [], '', {
      fromFrom: () => Promise.resolve([]),
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
    });

    expect(result).toEqual([]);
  });
});
