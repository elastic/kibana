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
import expect from '@kbn/expect';

import {
  createListStream,
  createPromiseFromStreams,
  createConcatStream,
} from '../../../../legacy/utils';

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

  it('understands aliases', async () => {
    const stats = createStubStats();
    const client = createStubClient(['index1'], { foo: 'index1' });

    const indexRecords = await createPromiseFromStreams([
      createListStream(['index1']),
      createGenerateIndexRecordsStream(client, stats),
      createConcatStream([]),
    ]);

    expect(indexRecords).to.eql([{
      type: 'index',
      value: {
        index: 'index1',
        settings: {},
        mappings: {},
        aliases: { foo: {} },
      }
    }]);
  });
});
