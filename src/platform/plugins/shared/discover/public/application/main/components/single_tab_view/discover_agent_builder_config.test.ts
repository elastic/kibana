/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { ESQL_QUERY_RESULTS_ATTACHMENT_TYPE } from '../../../../../common/agent_builder';
import {
  toDiscoverQuery,
  buildScreenContext,
  buildEsqlResultsAttachment,
} from './discover_agent_builder_config';

interface EsqlResultsData {
  query: string;
  columns: Array<{ name: string; type: string }>;
  sampleRows: Array<Record<string, unknown>>;
  totalHits: number;
  timeRange?: { from: string; to: string };
}

const getEsqlResultsData = (attachment: AttachmentInput): EsqlResultsData =>
  attachment.data as unknown as EsqlResultsData;

describe('toDiscoverQuery', () => {
  it('returns an ES|QL query when the current query is ES|QL', () => {
    const result = toDiscoverQuery({ esql: 'FROM logs-*' }, 'FROM metrics-*');
    expect(result).toEqual({ esql: 'FROM metrics-*' });
  });

  it('returns a KQL query preserving the current language', () => {
    const result = toDiscoverQuery({ language: 'lucene', query: 'status:200' }, 'status:500');
    expect(result).toEqual({ language: 'lucene', query: 'status:500' });
  });

  it('defaults to kuery when current query is undefined', () => {
    const result = toDiscoverQuery(undefined, 'some query');
    expect(result).toEqual({ language: 'kuery', query: 'some query' });
  });
});

describe('buildScreenContext', () => {
  it('builds a hidden screen context attachment for ES|QL mode', () => {
    const attachment = buildScreenContext(
      'logs-*',
      { esql: 'FROM logs-* | LIMIT 10' },
      ['@timestamp', 'message'],
      'esql',
      { from: 'now-15m', to: 'now' }
    );

    expect(attachment.hidden).toBe(true);
    expect(attachment.type).toBe(AttachmentType.screenContext);
    expect(attachment.data).toEqual(
      expect.objectContaining({
        app: 'discover',
        time_range: { from: 'now-15m', to: 'now' },
        additional_data: expect.objectContaining({
          query_language: 'esql',
          query: 'FROM logs-* | LIMIT 10',
          data_view: 'logs-*',
          data_source_type: 'esql',
          columns: JSON.stringify(['@timestamp', 'message']),
        }),
      })
    );
  });

  it('defaults to kuery when query is undefined', () => {
    const attachment = buildScreenContext('logs-*', undefined, undefined, undefined, undefined);

    expect(attachment.data).toEqual(
      expect.objectContaining({
        additional_data: expect.objectContaining({
          query_language: 'kuery',
          query: '',
          data_source_type: 'unknown',
          columns: '[]',
        }),
      })
    );
  });
});

describe('buildEsqlResultsAttachment', () => {
  const baseColumns = [
    { name: '@timestamp', meta: { type: 'date' } },
    { name: 'status', meta: { type: 'keyword' } },
    { name: 'bytes' },
  ];

  const baseRows = [
    { flattened: { '@timestamp': '2026-04-10T00:00:00Z', status: 'success', bytes: 1024 } },
    { flattened: { '@timestamp': '2026-04-10T01:00:00Z', status: 'error', bytes: 512 } },
  ];

  it('builds an attachment with the correct type and structure', () => {
    const attachment = buildEsqlResultsAttachment(
      'FROM logs-* | LIMIT 10',
      baseColumns,
      baseRows,
      500,
      { from: 'now-24h', to: 'now' }
    );

    expect(attachment.id).toBe('esql-query-results');
    expect(attachment.type).toBe(ESQL_QUERY_RESULTS_ATTACHMENT_TYPE);
    expect(attachment.data).toEqual({
      query: 'FROM logs-* | LIMIT 10',
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'status', type: 'keyword' },
        { name: 'bytes', type: 'unknown' },
      ],
      sampleRows: [
        { '@timestamp': '2026-04-10T00:00:00Z', status: 'success', bytes: 1024 },
        { '@timestamp': '2026-04-10T01:00:00Z', status: 'error', bytes: 512 },
      ],
      totalHits: 500,
      timeRange: { from: 'now-24h', to: 'now' },
    });
  });

  it('limits sample rows to 10', () => {
    const manyRows = Array.from({ length: 20 }, (_, i) => ({
      flattened: { status: `row-${i}` },
    }));

    const attachment = buildEsqlResultsAttachment(
      'FROM logs-*',
      [{ name: 'status', meta: { type: 'keyword' } }],
      manyRows,
      20,
      undefined
    );

    const { sampleRows } = getEsqlResultsData(attachment);
    expect(sampleRows).toHaveLength(10);
  });

  it('filters out .keyword columns when the base field exists', () => {
    const columns = [
      { name: 'host', meta: { type: 'string' } },
      { name: 'host.keyword', meta: { type: 'string' } },
      { name: 'status.keyword', meta: { type: 'keyword' } },
    ];

    const attachment = buildEsqlResultsAttachment('FROM logs-*', columns, [], 0, undefined);

    const { columns: resultColumns } = getEsqlResultsData(attachment);
    expect(resultColumns.map((c: { name: string }) => c.name)).toEqual(['host', 'status.keyword']);
  });

  it('limits columns to 100', () => {
    const manyColumns = Array.from({ length: 150 }, (_, i) => ({
      name: `col_${i}`,
      meta: { type: 'keyword' },
    }));

    const attachment = buildEsqlResultsAttachment('FROM logs-*', manyColumns, [], 0, undefined);

    const { columns } = getEsqlResultsData(attachment);
    expect(columns).toHaveLength(100);
  });

  it('truncates string values longer than 100 characters', () => {
    const longValue = 'x'.repeat(150);
    const rows = [{ flattened: { message: longValue } }];

    const attachment = buildEsqlResultsAttachment(
      'FROM logs-*',
      [{ name: 'message', meta: { type: 'text' } }],
      rows,
      1,
      undefined
    );

    const { sampleRows } = getEsqlResultsData(attachment);
    expect(sampleRows[0].message).toBe('x'.repeat(100) + '...');
  });

  it('defaults column type to unknown when meta is missing', () => {
    const attachment = buildEsqlResultsAttachment(
      'FROM logs-*',
      [{ name: 'field_no_meta' }],
      [],
      0,
      undefined
    );

    const { columns } = getEsqlResultsData(attachment);
    expect(columns[0]).toEqual({ name: 'field_no_meta', type: 'unknown' });
  });

  it('excludes undefined values from sample rows', () => {
    const rows = [{ flattened: { status: 'ok', missing_field: undefined } }];

    const attachment = buildEsqlResultsAttachment(
      'FROM logs-*',
      [
        { name: 'status', meta: { type: 'keyword' } },
        { name: 'missing_field', meta: { type: 'keyword' } },
      ],
      rows,
      1,
      undefined
    );

    const { sampleRows } = getEsqlResultsData(attachment);
    expect(sampleRows[0]).toEqual({ status: 'ok' });
    expect(sampleRows[0]).not.toHaveProperty('missing_field');
  });
});
