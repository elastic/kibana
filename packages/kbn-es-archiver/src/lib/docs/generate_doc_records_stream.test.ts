/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import sinon from 'sinon';
import { delay } from 'bluebird';
import { createListStream, createPromiseFromStreams, createConcatStream } from '@kbn/utils';

import { createGenerateDocRecordsStream } from './generate_doc_records_stream';
import { Progress } from '../progress';
import { createStubStats, createStubClient } from './__mocks__/stubs';

describe('esArchiver: createGenerateDocRecordsStream()', () => {
  it('scolls 1000 documents at a time', async () => {
    const stats = createStubStats();
    const client = createStubClient([
      (name, params) => {
        expect(name).toBe('search');
        expect(params).toHaveProperty('index', 'logstash-*');
        expect(params).toHaveProperty('size', 1000);
        return {
          hits: {
            total: 0,
            hits: [],
          },
        };
      },
    ]);

    const progress = new Progress();
    await createPromiseFromStreams([
      createListStream(['logstash-*']),
      createGenerateDocRecordsStream({ client, stats, progress }),
    ]);

    expect(progress.getTotal()).toBe(0);
    expect(progress.getComplete()).toBe(0);
  });

  it('uses a 1 minute scroll timeout', async () => {
    const stats = createStubStats();
    const client = createStubClient([
      (name, params) => {
        expect(name).toBe('search');
        expect(params).toHaveProperty('index', 'logstash-*');
        expect(params).toHaveProperty('scroll', '1m');
        expect(params).toHaveProperty('rest_total_hits_as_int', true);
        return {
          hits: {
            total: 0,
            hits: [],
          },
        };
      },
    ]);

    const progress = new Progress();
    await createPromiseFromStreams([
      createListStream(['logstash-*']),
      createGenerateDocRecordsStream({ client, stats, progress }),
    ]);

    expect(progress.getTotal()).toBe(0);
    expect(progress.getComplete()).toBe(0);
  });

  it('consumes index names and scrolls completely before continuing', async () => {
    const stats = createStubStats();
    let checkpoint = Date.now();
    const client = createStubClient([
      async (name, params) => {
        expect(name).toBe('search');
        expect(params).toHaveProperty('index', 'index1');
        await delay(200);
        return {
          _scroll_id: 'index1ScrollId',
          hits: { total: 2, hits: [{ _id: 1, _index: '.kibana_foo' }] },
        };
      },
      async (name, params) => {
        expect(name).toBe('scroll');
        expect(params).toHaveProperty('scrollId', 'index1ScrollId');
        expect(Date.now() - checkpoint).not.toBeLessThan(200);
        checkpoint = Date.now();
        await delay(200);
        return { hits: { total: 2, hits: [{ _id: 2, _index: 'foo' }] } };
      },
      async (name, params) => {
        expect(name).toBe('search');
        expect(params).toHaveProperty('index', 'index2');
        expect(Date.now() - checkpoint).not.toBeLessThan(200);
        checkpoint = Date.now();
        await delay(200);
        return { hits: { total: 0, hits: [] } };
      },
    ]);

    const progress = new Progress();
    const docRecords = await createPromiseFromStreams([
      createListStream(['index1', 'index2']),
      createGenerateDocRecordsStream({ client, stats, progress }),
      createConcatStream([]),
    ]);

    expect(docRecords).toEqual([
      {
        type: 'doc',
        value: {
          index: '.kibana_1',
          type: undefined,
          id: 1,
          source: undefined,
        },
      },
      {
        type: 'doc',
        value: {
          index: 'foo',
          type: undefined,
          id: 2,
          source: undefined,
        },
      },
    ]);
    sinon.assert.calledTwice(stats.archivedDoc as any);
    expect(progress.getTotal()).toBe(2);
    expect(progress.getComplete()).toBe(2);
  });
});
