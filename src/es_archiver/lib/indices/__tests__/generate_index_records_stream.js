import sinon from 'sinon';
import expect from 'expect.js';

import {
  createListStream,
  createPromiseFromStreams,
  createConcatStream,
} from '../../../../utils';

import {
  createStubClient,
  createStubStats,
} from './stubs';

import {
  createGenerateIndexRecordsStream,
} from '../generate_index_records_stream';

describe('esArchiver: createGenerateIndexRecordsStream()', () => {
  it('consumes index names and queries for the mapping of each', async () => {
    const indices = ['index1', 'index2', 'index3', 'index4'];
    const stats = createStubStats();
    const client = createStubClient(indices);

    await createPromiseFromStreams([
      createListStream(indices),
      createGenerateIndexRecordsStream(client, stats)
    ]);

    expect(stats.getTestSummary()).to.eql({
      archivedIndex: 4
    });

    sinon.assert.callCount(client.indices.get, 4);
    sinon.assert.notCalled(client.indices.create);
    sinon.assert.notCalled(client.indices.delete);
    sinon.assert.notCalled(client.indices.exists);
  });

  it('filters index metadata from settings', async () => {
    const stats = createStubStats();
    const client = createStubClient(['index1']);

    await createPromiseFromStreams([
      createListStream(['index1']),
      createGenerateIndexRecordsStream(client, stats)
    ]);

    const params = client.indices.get.args[0][0];
    expect(params).to.have.property('filterPath');
    const filters = params.filterPath;
    expect(filters.some(path => path.includes('index.creation_date'))).to.be(true);
    expect(filters.some(path => path.includes('index.uuid'))).to.be(true);
    expect(filters.some(path => path.includes('index.version'))).to.be(true);
    expect(filters.some(path => path.includes('index.provided_name'))).to.be(true);
  });

  it('produces one index record for each index name it receives', async () => {
    const stats = createStubStats();
    const client = createStubClient(['index1', 'index2', 'index3']);

    const indexRecords = await createPromiseFromStreams([
      createListStream(['index1', 'index2', 'index3']),
      createGenerateIndexRecordsStream(client, stats),
      createConcatStream([]),
    ]);

    expect(indexRecords).to.have.length(3);

    expect(indexRecords[0]).to.have.property('type', 'index');
    expect(indexRecords[0]).to.have.property('value');
    expect(indexRecords[0].value).to.have.property('index', 'index1');

    expect(indexRecords[1]).to.have.property('type', 'index');
    expect(indexRecords[1]).to.have.property('value');
    expect(indexRecords[1].value).to.have.property('index', 'index2');

    expect(indexRecords[2]).to.have.property('type', 'index');
    expect(indexRecords[2]).to.have.property('value');
    expect(indexRecords[2].value).to.have.property('index', 'index3');
  });
});
