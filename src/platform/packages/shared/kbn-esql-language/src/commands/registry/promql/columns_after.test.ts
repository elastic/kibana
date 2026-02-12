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
        fromFrom: () => Promise.resolve([]),
        fromJoin: () => Promise.resolve([]),
        fromEnrich: () => Promise.resolve([]),
        fromPromql: () => Promise.resolve(sourceFields),
      }
    );

    expect(result).toEqual(sourceFields);
  });

  it('returns empty when no index param is present', async () => {
    const result = await columnsAfter(synth.cmd`PROMQL rate(http_requests_total[5m])`, [], '', {
      fromFrom: () => Promise.resolve([]),
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
      fromPromql: () => Promise.resolve([]),
    });

    expect(result).toEqual([]);
  });

  it('returns only derived columns when a pipe follows', async () => {
    const result = await columnsAfter(
      synth.cmd`PROMQL index=metrics step=5m col0=(sum by (job) (http_requests_total{env="prod"}))`,
      [],
      'PROMQL index=metrics step=5m col0=(sum by (job) (http_requests_total{env="prod"})) | KEEP job',
      {
        fromFrom: () => Promise.resolve([]),
        fromJoin: () => Promise.resolve([]),
        fromEnrich: () => Promise.resolve([]),
        fromPromql: () =>
          Promise.resolve([
            { name: 'job', type: 'keyword', userDefined: false },
            { name: 'env', type: 'keyword', userDefined: false },
            { name: 'http_requests_total', type: 'double', userDefined: false },
            { name: 'extra_field', type: 'keyword', userDefined: false },
          ]),
      }
    );

    expect(result.map(({ name }) => name)).toEqual(['step', 'col0', 'job']);
  });

  it('does not treat pipe inside label string as command delimiter', async () => {
    const sourceFields: ESQLFieldWithMetadata[] = [
      { name: 'bytes', type: 'double', userDefined: false },
      { name: 'event.dataset', type: 'keyword', userDefined: false },
    ];

    const result = await columnsAfter(
      synth.cmd`PROMQL step=5m sum(rate(bytes{event.dataset="|"}[5m]))`,
      [],
      'PROMQL step=5m sum(rate(bytes{event.dataset="|"}[5m]))',
      {
        fromFrom: () => Promise.resolve([]),
        fromJoin: () => Promise.resolve([]),
        fromEnrich: () => Promise.resolve([]),
        fromPromql: () => Promise.resolve(sourceFields),
      }
    );

    expect(result).toEqual(sourceFields);
  });
});
