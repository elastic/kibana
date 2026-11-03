/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import {
  createSeededRandom,
  edotBrowser,
  timerange,
  type EdotBrowserDocument,
} from '@kbn/synthtrace-client';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Readable } from 'stream';
import type { Logger } from '../utils/create_logger';
import { OtelSynthtraceEsClientImpl, getOtelDocumentIndex } from './otel_synthtrace_es_client';

describe('OtelSynthtraceEsClient', () => {
  describe('getOtelDocumentIndex', () => {
    it('keeps an explicit _index', () => {
      expect(getOtelDocumentIndex({ _index: 'logs-generic.otel-default' })).toBe(
        'logs-generic.otel-default'
      );
    });

    it('derives the index from a nested data_stream object', () => {
      expect(
        getOtelDocumentIndex({
          data_stream: { type: 'traces', dataset: 'generic.otel', namespace: 'default' },
        })
      ).toBe('traces-generic.otel-default');
    });

    it('derives the index from flattened data_stream fields', () => {
      expect(
        getOtelDocumentIndex({
          'data_stream.type': 'logs',
          'data_stream.dataset': 'browser.otel',
          'data_stream.namespace': 'qa',
        })
      ).toBe('logs-browser.otel-qa');
    });

    it('throws when the index cannot be determined', () => {
      expect(() => getOtelDocumentIndex({ '@timestamp': 1 })).toThrow(
        'Cannot determine index for event'
      );
    });
  });

  it('indexes OTel-native documents as-is', async () => {
    let datasource: Readable | undefined;
    const client = new OtelSynthtraceEsClientImpl({
      client: {
        helpers: {
          bulk: async (options: { datasource: Readable }) => {
            datasource = options.datasource;
          },
        },
      } as unknown as Client,
      logger: { info: jest.fn(), debug: jest.fn(), verbose: jest.fn() } as unknown as Logger,
    });
    const browser = edotBrowser
      .app({ serviceName: 'storefront-web', environment: 'production' })
      .client(edotBrowser.browserProfiles.chromeMacos);
    const site = { origin: 'https://shop.example.com', pages: [{ path: '/' }] };
    const generator = timerange(
      new Date('2026-10-16T12:00:00.000Z'),
      new Date('2026-10-16T12:02:00.000Z'),
      {} as ToolingLog
    )
      .interval('1m')
      .generator((timestamp) =>
        edotBrowser.session({
          client: browser,
          site,
          health: edotBrowser.healthProfiles.healthy,
          start: timestamp,
          pageViews: 1,
          random: createSeededRandom(`es-client:${timestamp}`),
        })
      );

    await client.index(generator);

    const docs: EdotBrowserDocument[] = [];
    for await (const doc of datasource!) {
      docs.push(doc);
    }

    expect(docs.length).toBeGreaterThan(10);
    docs.forEach((doc) => {
      expect(['logs-generic.otel-default', 'traces-generic.otel-default']).toContain(doc._index);
      expect(doc).not.toHaveProperty('processor.event');
      expect(doc).not.toHaveProperty('processor');
    });
    expect(client.getAllIndices()).toEqual(['logs-*.otel-*', 'traces-*.otel-*']);
  });
});
