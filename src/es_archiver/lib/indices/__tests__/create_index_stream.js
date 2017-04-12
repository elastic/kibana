import expect from 'expect.js';
import sinon from 'sinon';
import Chance from 'chance';

import {
  createPromiseFromStreams,
  createConcatStream,
  createListStream
} from '../../../../utils';

import {
  createCreateIndexStream
} from '../create_index_stream';

import {
  createStubStats,
  createStubIndexRecord,
  createStubDocRecord,
  createStubClient
} from './stubs';

const chance = new Chance();

describe('esArchiver: createCreateIndexStream()', () => {
  describe('defaults', () => {
    it('deletes existing indices, creates all', async () => {
      const client = createStubClient(['existing-index']);
      const stats = createStubStats();
      await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('existing-index'),
          createStubIndexRecord('new-index')
        ]),
        createCreateIndexStream({ client, stats })
      ]);

      expect(stats.getTestSummary()).to.eql({
        deletedIndex: 1,
        createdIndex: 2
      });
      sinon.assert.callCount(client.indices.delete, 1);
      sinon.assert.callCount(client.indices.create, 3); // one failed create because of existing
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
        createCreateIndexStream({ client, stats }),
        createConcatStream([])
      ]);

      expect(output).to.eql([
        createStubDocRecord('index', 1),
        createStubDocRecord('index', 2),
      ]);
    });

    it('passes through records with unknown types', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      const randoms = [
        { type: chance.word(), value: chance.hashtag() },
        { type: chance.word(), value: chance.hashtag() },
      ];

      const output = await createPromiseFromStreams([
        createListStream([
          createStubIndexRecord('index'),
          ...randoms
        ]),
        createCreateIndexStream({ client, stats }),
        createConcatStream([])
      ]);

      expect(output).to.eql(randoms);
    });

    it('passes through non-record values', async () => {
      const client = createStubClient();
      const stats = createStubStats();
      const nonRecordValues = [
        undefined,
        chance.email(),
        12345,
        Infinity,
        /abc/,
        new Date()
      ];

      const output = await createPromiseFromStreams([
        createListStream(nonRecordValues),
        createCreateIndexStream({ client, stats }),
        createConcatStream([])
      ]);

      expect(output).to.eql(nonRecordValues);
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
          skipExisting: true
        })
      ]);

      expect(stats.getTestSummary()).to.eql({
        skippedIndex: 1,
        createdIndex: 1,
      });
      sinon.assert.callCount(client.indices.delete, 0);
      sinon.assert.callCount(client.indices.create, 2); // one failed create because of existing
      expect(client.indices.create.args[0][0]).to.have.property('index', 'new-index');
    });

    it('filters documents for skipped indicies', async () => {
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
          skipExisting: true
        }),
        createConcatStream([])
      ]);

      expect(stats.getTestSummary()).to.eql({
        skippedIndex: 1,
        createdIndex: 1
      });
      sinon.assert.callCount(client.indices.delete, 0);
      sinon.assert.callCount(client.indices.create, 2); // one failed create because of existing

      expect(output).to.have.length(2);
      expect(output).to.eql([
        createStubDocRecord('new-index', 1),
        createStubDocRecord('new-index', 2)
      ]);
    });
  });
});
