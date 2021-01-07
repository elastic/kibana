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

import sinon from 'sinon';
import Chance from 'chance';
import { createPromiseFromStreams, createConcatStream, createListStream } from '@kbn/utils';

import { createCreateIndexStream } from './create_index_stream';

import {
  createStubStats,
  createStubIndexRecord,
  createStubDocRecord,
  createStubClient,
  createStubLogger,
} from './__mocks__/stubs';

const chance = new Chance();

const log = createStubLogger();

describe('esArchiver: createCreateIndexStream()', () => {
  describe('defaults', () => {
    it('deletes existing indices, creates all', async () => {
      const client = createStubClient(['existing-index']);
      const stats = createStubStats();
      await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('existing-index'),
          createStubIndexRecord('new-index'),
        ]),
        createCreateIndexStream({ client, stats, log }),
      ]);

      expect(stats.getTestSummary()).toEqual({
        deletedIndex: 1,
        createdIndex: 2,
      });
      sinon.assert.callCount(client.indices.delete as sinon.SinonSpy, 1);
      sinon.assert.callCount(client.indices.create as sinon.SinonSpy, 3); // one failed create because of existing
    });

    it('deletes existing aliases, creates all', async () => {
      const client = createStubClient(['actual-index'], { 'existing-index': 'actual-index' });
      const stats = createStubStats();
      await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('existing-index'),
          createStubIndexRecord('new-index'),
        ]),
        createCreateIndexStream({ client, stats, log }),
      ]);

      expect((client.indices.getAlias as sinon.SinonSpy).calledOnce).toBe(true);
      expect((client.indices.getAlias as sinon.SinonSpy).args[0][0]).toEqual({
        name: 'existing-index',
        ignore: [404],
      });
      expect((client.indices.delete as sinon.SinonSpy).calledOnce).toBe(true);
      expect((client.indices.delete as sinon.SinonSpy).args[0][0]).toEqual({
        index: ['actual-index'],
      });
      sinon.assert.callCount(client.indices.create as sinon.SinonSpy, 3); // one failed create because of existing
    });

    it('passes through "hit" records', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      const output = await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('index'),
          createStubDocRecord('index', 1),
          createStubDocRecord('index', 2),
        ]),
        createCreateIndexStream({ client, stats, log }),
        createConcatStream([]),
      ]);

      expect(output).toEqual([createStubDocRecord('index', 1), createStubDocRecord('index', 2)]);
    });

    it('creates aliases', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('index', { foo: {} }),
          createStubDocRecord('index', 1),
        ]),
        createCreateIndexStream({ client, stats, log }),
        createConcatStream([]),
      ]);

      sinon.assert.calledWith(client.indices.create as sinon.SinonSpy, {
        method: 'PUT',
        index: 'index',
        body: {
          settings: undefined,
          mappings: undefined,
          aliases: { foo: {} },
        },
      });
    });

    it('passes through records with unknown types', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      const randoms = [
        { type: chance.word(), value: chance.hashtag() },
        { type: chance.word(), value: chance.hashtag() },
      ];

      const output = await createPromiseFromStreams([
        createListStream([createStubIndexRecord('index'), ...randoms]),
        createCreateIndexStream({ client, stats, log }),
        createConcatStream([]),
      ]);

      expect(output).toEqual(randoms);
    });

    it('passes through non-record values', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      const nonRecordValues = [undefined, chance.email(), 12345, Infinity, /abc/, new Date()];

      const output = await createPromiseFromStreams([
        createListStream(nonRecordValues),
        createCreateIndexStream({ client, stats, log }),
        createConcatStream([]),
      ]);

      expect(output).toEqual(nonRecordValues);
    });
  });

  describe('skipExisting = true', () => {
    it('ignores preexisting indexes', async () => {
      const client = createStubClient(['existing-index']);
      const stats = createStubStats();

      await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('new-index'),
          createStubIndexRecord('existing-index'),
        ]),
        createCreateIndexStream({
          client,
          stats,
          log,
          skipExisting: true,
        }),
      ]);

      expect(stats.getTestSummary()).toEqual({
        skippedIndex: 1,
        createdIndex: 1,
      });
      sinon.assert.callCount(client.indices.delete as sinon.SinonSpy, 0);
      sinon.assert.callCount(client.indices.create as sinon.SinonSpy, 2); // one failed create because of existing
      expect((client.indices.create as sinon.SinonSpy).args[0][0]).toHaveProperty(
        'index',
        'new-index'
      );
    });

    it('filters documents for skipped indices', async () => {
      const client = createStubClient(['existing-index']);
      const stats = createStubStats();

      const output = await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('new-index'),
          createStubDocRecord('new-index', 1),
          createStubDocRecord('new-index', 2),
          createStubIndexRecord('existing-index'),
          createStubDocRecord('existing-index', 1),
          createStubDocRecord('existing-index', 2),
        ]),
        createCreateIndexStream({
          client,
          stats,
          log,
          skipExisting: true,
        }),
        createConcatStream([]),
      ]);

      expect(stats.getTestSummary()).toEqual({
        skippedIndex: 1,
        createdIndex: 1,
      });
      sinon.assert.callCount(client.indices.delete as sinon.SinonSpy, 0);
      sinon.assert.callCount(client.indices.create as sinon.SinonSpy, 2); // one failed create because of existing

      expect(output).toHaveLength(2);
      expect(output).toEqual([
        createStubDocRecord('new-index', 1),
        createStubDocRecord('new-index', 2),
      ]);
    });
  });
});
