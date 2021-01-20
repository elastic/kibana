/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { delay } from 'bluebird';
import { createListStream, createPromiseFromStreams } from '@kbn/utils';

import { Progress } from '../progress';
import { createIndexDocRecordsStream } from './index_doc_records_stream';
import { createStubStats, createStubClient, createPersonDocRecords } from './__mocks__/stubs';

const recordsToBulkBody = (records: any[]) => {
  return records.reduce((acc, record) => {
    const { index, id, source } = record.value;

    return [...acc, { index: { _index: index, _id: id } }, source];
  }, [] as any[]);
};

describe('esArchiver: createIndexDocRecordsStream()', () => {
  it('consumes doc records and sends to `_bulk` api', async () => {
    const records = createPersonDocRecords(1);
    const client = createStubClient([
      async (name, params) => {
        expect(name).toBe('bulk');
        expect(params).toEqual({
          body: recordsToBulkBody(records),
          requestTimeout: 120000,
        });
        return { ok: true };
      },
    ]);
    const stats = createStubStats();
    const progress = new Progress();

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats, progress),
    ]);

    client.assertNoPendingResponses();
    expect(progress.getComplete()).toBe(1);
    expect(progress.getTotal()).toBe(undefined);
  });

  it('consumes multiple doc records and sends to `_bulk` api together', async () => {
    const records = createPersonDocRecords(10);
    const client = createStubClient([
      async (name, params) => {
        expect(name).toBe('bulk');
        expect(params).toEqual({
          body: recordsToBulkBody(records.slice(0, 1)),
          requestTimeout: 120000,
        });
        return { ok: true };
      },
      async (name, params) => {
        expect(name).toBe('bulk');
        expect(params).toEqual({
          body: recordsToBulkBody(records.slice(1)),
          requestTimeout: 120000,
        });
        return { ok: true };
      },
    ]);
    const stats = createStubStats();
    const progress = new Progress();

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats, progress),
    ]);

    client.assertNoPendingResponses();
    expect(progress.getComplete()).toBe(10);
    expect(progress.getTotal()).toBe(undefined);
  });

  it('waits until request is complete before sending more', async () => {
    const records = createPersonDocRecords(10);
    const stats = createStubStats();
    const start = Date.now();
    const delayMs = 1234;
    const client = createStubClient([
      async (name, params) => {
        expect(name).toBe('bulk');
        expect(params).toEqual({
          body: recordsToBulkBody(records.slice(0, 1)),
          requestTimeout: 120000,
        });
        await delay(delayMs);
        return { ok: true };
      },
      async (name, params) => {
        expect(name).toBe('bulk');
        expect(params).toEqual({
          body: recordsToBulkBody(records.slice(1)),
          requestTimeout: 120000,
        });
        expect(Date.now() - start).not.toBeLessThan(delayMs);
        return { ok: true };
      },
    ]);
    const progress = new Progress();

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats, progress),
    ]);

    client.assertNoPendingResponses();
    expect(progress.getComplete()).toBe(10);
    expect(progress.getTotal()).toBe(undefined);
  });

  it('sends a maximum of 300 documents at a time', async () => {
    const records = createPersonDocRecords(301);
    const stats = createStubStats();
    const client = createStubClient([
      async (name, params) => {
        expect(name).toBe('bulk');
        expect(params.body.length).toEqual(1 * 2);
        return { ok: true };
      },
      async (name, params) => {
        expect(name).toBe('bulk');
        expect(params.body.length).toEqual(299 * 2);
        return { ok: true };
      },
      async (name, params) => {
        expect(name).toBe('bulk');
        expect(params.body.length).toEqual(1 * 2);
        return { ok: true };
      },
    ]);
    const progress = new Progress();

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats, progress),
    ]);

    client.assertNoPendingResponses();
    expect(progress.getComplete()).toBe(301);
    expect(progress.getTotal()).toBe(undefined);
  });

  it('emits an error if any request fails', async () => {
    const records = createPersonDocRecords(2);
    const stats = createStubStats();
    const client = createStubClient([
      async () => ({ ok: true }),
      async () => ({ errors: true, forcedError: true }),
    ]);
    const progress = new Progress();

    try {
      await createPromiseFromStreams([
        createListStream(records),
        createIndexDocRecordsStream(client, stats, progress),
      ]);
      throw new Error('expected stream to emit error');
    } catch (err) {
      expect(err.message).toMatch(/"forcedError":\s*true/);
    }

    client.assertNoPendingResponses();
    expect(progress.getComplete()).toBe(1);
    expect(progress.getTotal()).toBe(undefined);
  });
});
