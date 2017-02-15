import { Writable } from 'stream';

import expect from 'expect.js';
import sinon from 'sinon';

import { createCreateIndexStream } from '../create_index_stream';

const stubClient = (existingIndices) => ({
  indices: {
    create: sinon.spy(async ({ index }) => {
      if (existingIndices.includes(index)) {
        throw new Error('index already exists');
      } else {
        existingIndices.push(index);
        return { ok: true };
      }
    }),
    delete: sinon.spy(async ({ index }) => {
      if (existingIndices.includes(index)) {
        existingIndices.splice(existingIndices.indexOf(index), 1);
        return { ok: true };
      } else {
        throw new Error('cannot delete non-existant index');
      }
    }),
    exists: sinon.spy(async ({ index }) => {
      return existingIndices.includes(index);
    })
  }
});

const stubStats = () => ({
  creating: sinon.stub(),
  deleting: sinon.stub(),
  skipping: sinon.stub(),
});

const stubIndexSnapshot = (index) => ({
  type: 'index',
  value: { index }
});

const stubDocSnapshot = (index, id) => ({
  type: 'hit',
  value: { index, id }
});

const drain = async (stream) => {
  return new Promise((resolve, reject) => {
    const output = [];
    stream
      .on('error', reject)
      .pipe(new Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
          output.push(chunk);
          callback(null);
        }
      }))
      .on('error', reject)
      .on('finish', () => resolve(output));
  });
};

describe('IndexStreams/toEs', () => {
  context('defaults', () => {
    it('creates non-existing indices', async () => {
      const client = stubClient([]);
      const stats = stubStats();

      const toEs = createCreateIndexStream({ client, stats });
      toEs.end(stubIndexSnapshot('foobar'));
      await drain(toEs);

      sinon.assert.calledOnce(client.indices.exists);
      sinon.assert.notCalled(client.indices.delete);
      sinon.assert.calledOnce(client.indices.create);
    });

    it('deletes existing indices', async () => {
      const client = stubClient(['foobar']);
      const stats = stubStats();

      const toEs = createCreateIndexStream({ client, stats });
      toEs.end(stubIndexSnapshot('foobar'));
      await drain(toEs);

      sinon.assert.calledOnce(client.indices.exists);
      sinon.assert.calledOnce(client.indices.delete);
      sinon.assert.calledOnce(client.indices.create);
    });
  });

  context('skipExisting = true', () => {
    it('ignores preexisting indexes', async () => {
      const client = stubClient(['existing']);
      const stats = stubStats();

      const toEs = createCreateIndexStream({ client, stats, skipExisting: true });
      toEs.write(stubIndexSnapshot('non-existant'));
      toEs.write(stubIndexSnapshot('existing'));
      toEs.end();
      await drain(toEs);

      sinon.assert.notCalled(client.indices.delete);
      sinon.assert.calledOnce(client.indices.create);
      expect(client.indices.create.args[0][0]).to.have.property('index', 'non-existant');
    });

    it('filters documents for skipped indicies', async () => {
      const client = stubClient(['existing']);
      const stats = stubStats();

      const toEs = createCreateIndexStream({ client, stats, skipExisting: true });
      toEs.write(stubIndexSnapshot('non-existant'));
      toEs.write(stubDocSnapshot('non-existant', 1));
      toEs.write(stubDocSnapshot('non-existant', 2));
      toEs.write(stubIndexSnapshot('existing'));
      toEs.write(stubDocSnapshot('existing', 1));
      toEs.write(stubDocSnapshot('existing', 2));
      toEs.end();
      const output = await drain(toEs);

      expect(output).to.have.length(2);
      expect(output).to.eql([
        stubDocSnapshot('non-existant', 1),
        stubDocSnapshot('non-existant', 2)
      ]);
    });
  });
});
