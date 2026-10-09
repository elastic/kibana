/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import { Parser, synth } from '@elastic/esql';
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

  it('returns step column when buckets param is used', async () => {
    const result = await columnsAfter(
      synth.cmd`PROMQL index=metrics buckets=6 col0=(sum by (job) (http_requests_total{env="prod"}))`,
      [],
      'PROMQL index=metrics buckets=6 col0=(sum by (job) (http_requests_total{env="prod"})) | KEEP job',
      {
        fromFrom: () => Promise.resolve([]),
        fromJoin: () => Promise.resolve([]),
        fromEnrich: () => Promise.resolve([]),
        fromPromql: () =>
          Promise.resolve([
            { name: 'job', type: 'keyword', userDefined: false },
            { name: 'http_requests_total', type: 'double', userDefined: false },
          ]),
      }
    );

    expect(result.map(({ name }) => name)).toEqual(['step', 'col0', 'job']);
  });

  it('returns step column even when time param is used', async () => {
    const result = await columnsAfter(
      synth.cmd`PROMQL index=metrics time="2026-01-13T11:30:00.000Z" col0=(sum by (job) (http_requests_total{env="prod"}))`,
      [],
      'PROMQL index=metrics time="2026-01-13T11:30:00.000Z" col0=(sum by (job) (http_requests_total{env="prod"})) | KEEP job',
      {
        fromFrom: () => Promise.resolve([]),
        fromJoin: () => Promise.resolve([]),
        fromEnrich: () => Promise.resolve([]),
        fromPromql: () =>
          Promise.resolve([
            { name: 'job', type: 'keyword', userDefined: false },
            { name: 'http_requests_total', type: 'double', userDefined: false },
          ]),
      }
    );

    expect(result.map(({ name }) => name)).toEqual(['step', 'col0', 'job']);
  });

  it('reconstructs the expression column name when a pipe follows and no col0= is provided', async () => {
    const expression = 'rate(http_requests_total[5m])';
    const query = `PROMQL index=metrics (${expression}) | KEEP http_requests_total`;
    const {
      root: {
        commands: [command],
      },
    } = Parser.parseQuery(query);

    const result = await columnsAfter(command, [], query, {
      fromFrom: () => Promise.resolve([]),
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
      fromPromql: () =>
        Promise.resolve([{ name: 'http_requests_total', type: 'double', userDefined: false }]),
    });

    expect(result.map(({ name }) => name)).toEqual(['step', expression]);
    expect(result[1]).toEqual(
      expect.objectContaining({ name: expression, type: 'unknown', userDefined: true })
    );
  });

  it('returns both the expression column and breakdown labels', async () => {
    const expression = 'sum by (job) (rate(http_requests_total[5m]))';
    const query = `PROMQL index=metrics ${expression} | KEEP job`;
    const {
      root: {
        commands: [command],
      },
    } = Parser.parseQuery(query);

    const result = await columnsAfter(command, [], query, {
      fromFrom: () => Promise.resolve([]),
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
      fromPromql: () =>
        Promise.resolve([
          { name: 'job', type: 'keyword', userDefined: false },
          { name: 'http_requests_total', type: 'double', userDefined: false },
        ]),
    });

    expect(result.map(({ name }) => name)).toEqual(['step', expression, 'job']);
    expect(result[1]).toEqual(
      expect.objectContaining({ name: expression, type: 'unknown', userDefined: true })
    );
    expect(result[2]).toEqual({ name: 'job', type: 'keyword', userDefined: false });
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
