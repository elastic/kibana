import sinon from 'sinon';

import {
  createListStream,
  createPromiseFromStreams,
} from '../../../../utils';

import {
  createDeleteIndexStream,
} from '../delete_index_stream';

import {
  createStubStats,
  createStubClient,
  createStubIndexRecord
} from './stubs';

describe('esArchiver: createDeleteIndexStream()', () => {
  it('deletes the index without checking if it exists', async () => {
    const stats = createStubStats();
    const client = createStubClient([]);

    await createPromiseFromStreams([
      createListStream([
        createStubIndexRecord('index1')
      ]),
      createDeleteIndexStream(client, stats),
    ]);

    sinon.assert.notCalled(stats.deletedIndex);
    sinon.assert.notCalled(client.indices.create);
    sinon.assert.calledOnce(client.indices.delete);
    sinon.assert.notCalled(client.indices.exists);
  });

  it('reports the delete when the index existed', async () => {
    const stats = createStubStats();
    const client = createStubClient(['index1']);

    await createPromiseFromStreams([
      createListStream([
        createStubIndexRecord('index1')
      ]),
      createDeleteIndexStream(client, stats),
    ]);

    sinon.assert.calledOnce(stats.deletedIndex);
    sinon.assert.notCalled(client.indices.create);
    sinon.assert.calledOnce(client.indices.delete);
    sinon.assert.notCalled(client.indices.exists);
  });
});
