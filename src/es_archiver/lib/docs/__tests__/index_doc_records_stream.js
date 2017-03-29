import expect from 'expect.js';
import { delay } from 'bluebird';

import {
  createListStream,
  createPromiseFromStreams,
} from '../../../../utils';

import { createIndexDocRecordsStream } from '../index_doc_records_stream';
import {
  createStubStats,
  createStubClient,
  createPersonDocRecords,
} from './stubs';

const recordsToBulkBody = records => {
  return records.reduce((acc, record) => {
    const { index, type, id, source } = record.value;

    return [
      ...acc,
      { index: { _index: index, _type: type, _id: id } },
      source
    ];
  }, []);
};

describe('esArchiver: createIndexDocRecordsStream()', () => {
  it('consumes doc records and sends to `_bulk` api', async () => {
    const records = createPersonDocRecords(1);
    const client = createStubClient([
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params).to.eql({
          body: recordsToBulkBody(records)
        });
        return { ok: true };
      }
    ]);
    const stats = createStubStats();

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats),
    ]);

    client.assertNoPendingResponses();
  });

  it('consumes multiple doc records and sends to `_bulk` api together', async () => {
    const records = createPersonDocRecords(10);
    const client = createStubClient([
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params).to.eql({
          body: recordsToBulkBody(records.slice(0, 1))
        });
        return { ok: true };
      },
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params).to.eql({
          body: recordsToBulkBody(records.slice(1))
        });
        return { ok: true };
      }
    ]);
    const stats = createStubStats();

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats),
    ]);

    client.assertNoPendingResponses();
  });

  it('waits until request is complete before sending more', async () => {
    const records = createPersonDocRecords(10);
    const stats = createStubStats();
    const start = Date.now();
    const delayMs = 1234;
    const client = createStubClient([
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params).to.eql({
          body: recordsToBulkBody(records.slice(0, 1))
        });
        await delay(delayMs);
        return { ok: true };
      },
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params).to.eql({
          body: recordsToBulkBody(records.slice(1))
        });
        expect(Date.now() - start).to.not.be.lessThan(delayMs);
        return { ok: true };
      }
    ]);

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats)
    ]);

    client.assertNoPendingResponses();
  });

  it('sends a maximum of 1000 documents at a time', async () => {
    const records = createPersonDocRecords(1001);
    const stats = createStubStats();
    const client = createStubClient([
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params.body.length).to.eql(1 * 2);
        return { ok: true };
      },
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params.body.length).to.eql(999 * 2);
        return { ok: true };
      },
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params.body.length).to.eql(1 * 2);
        return { ok: true };
      },
    ]);

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats),
    ]);

    client.assertNoPendingResponses();
  });

  it('emits an error if any request fails', async () => {
    const records = createPersonDocRecords(2);
    const stats = createStubStats();
    const client = createStubClient([
      async () => ({ ok: true }),
      async () => ({ errors: true, forcedError: true })
    ]);

    try {
      await createPromiseFromStreams([
        createListStream(records),
        createIndexDocRecordsStream(client, stats),
      ]);
      throw new Error('expected stream to emit error');
    } catch (err) {
      expect(err.message).to.match(/"forcedError":\s*true/);
    }

    client.assertNoPendingResponses();
  });
});
