/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import { delay } from 'bluebird';

import { createListStream, createPromiseFromStreams } from '../../../../legacy/utils';

import { Progress } from '../../progress';
import { createIndexDocRecordsStream } from '../index_doc_records_stream';
import { createStubStats, createStubClient, createPersonDocRecords } from './stubs';

const recordsToBulkBody = records => {
  return records.reduce((acc, record) => {
    const { index, type, id, source } = record.value;

    return [...acc, { index: { _index: index, _type: type, _id: id } }, source];
  }, []);
};

describe('esArchiver: createIndexDocRecordsStream()', () => {
  it('consumes doc records and sends to `_bulk` api', async () => {
    const records = createPersonDocRecords(1);
    const client = createStubClient([
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params).to.eql({
          body: recordsToBulkBody(records),
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
    expect(progress.getComplete()).to.be(1);
    expect(progress.getTotal()).to.be(undefined);
  });

  it('consumes multiple doc records and sends to `_bulk` api together', async () => {
    const records = createPersonDocRecords(10);
    const client = createStubClient([
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params).to.eql({
          body: recordsToBulkBody(records.slice(0, 1)),
        });
        return { ok: true };
      },
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params).to.eql({
          body: recordsToBulkBody(records.slice(1)),
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
    expect(progress.getComplete()).to.be(10);
    expect(progress.getTotal()).to.be(undefined);
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
          body: recordsToBulkBody(records.slice(0, 1)),
        });
        await delay(delayMs);
        return { ok: true };
      },
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params).to.eql({
          body: recordsToBulkBody(records.slice(1)),
        });
        expect(Date.now() - start).to.not.be.lessThan(delayMs);
        return { ok: true };
      },
    ]);
    const progress = new Progress();

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats, progress),
    ]);

    client.assertNoPendingResponses();
    expect(progress.getComplete()).to.be(10);
    expect(progress.getTotal()).to.be(undefined);
  });

  it('sends a maximum of 300 documents at a time', async () => {
    const records = createPersonDocRecords(301);
    const stats = createStubStats();
    const client = createStubClient([
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params.body.length).to.eql(1 * 2);
        return { ok: true };
      },
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params.body.length).to.eql(299 * 2);
        return { ok: true };
      },
      async (name, params) => {
        expect(name).to.be('bulk');
        expect(params.body.length).to.eql(1 * 2);
        return { ok: true };
      },
    ]);
    const progress = new Progress();

    await createPromiseFromStreams([
      createListStream(records),
      createIndexDocRecordsStream(client, stats, progress),
    ]);

    client.assertNoPendingResponses();
    expect(progress.getComplete()).to.be(301);
    expect(progress.getTotal()).to.be(undefined);
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
      expect(err.message).to.match(/"forcedError":\s*true/);
    }

    client.assertNoPendingResponses();
    expect(progress.getComplete()).to.be(1);
    expect(progress.getTotal()).to.be(undefined);
  });
});
