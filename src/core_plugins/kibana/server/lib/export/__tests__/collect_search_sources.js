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
import * as deps from '../collect_index_patterns';
import { collectSearchSources } from '../collect_search_sources';
import { expect } from 'chai';
describe('collectSearchSources(req, panels)', () => {
  const savedObjectsClient = { bulkGet: sinon.stub() };

  let panels;
  let collectIndexPatternsStub;

  beforeEach(() => {
    panels = [
      { attributes: { savedSearchId: 1 } },
      { attributes: { savedSearchId: 2 } }
    ];

    collectIndexPatternsStub = sinon.stub(deps, 'collectIndexPatterns');
    collectIndexPatternsStub.returns(Promise.resolve([{ id: 'logstash-*' }]));

    savedObjectsClient.bulkGet.returns(Promise.resolve({
      saved_objects: [
        { id: 1 }, { id: 2 }
      ]
    }));
  });

  afterEach(() => {
    collectIndexPatternsStub.restore();
    savedObjectsClient.bulkGet.resetHistory();
  });

  it('should request all search sources', async () => {
    await collectSearchSources(savedObjectsClient, panels);

    expect(savedObjectsClient.bulkGet.calledOnce).to.equal(true);
    expect(savedObjectsClient.bulkGet.getCall(0).args[0]).to.eql([
      { type: 'search', id: 1 }, { type: 'search', id: 2 }
    ]);
  });

  it('should return the search source and index patterns', async () => {
    const results = await collectSearchSources(savedObjectsClient, panels);

    expect(results).to.eql([
      { id: 1 },
      { id: 2 },
      { id: 'logstash-*' }
    ]);
  });

  it('should return an empty array if nothing is requested', async () => {
    const input = [
      {
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ index: 'bad-*' })
          }
        }
      }
    ];

    const results = await collectSearchSources(savedObjectsClient, input);
    expect(results).to.eql([]);
    expect(savedObjectsClient.bulkGet.calledOnce).to.eql(false);
  });
});
