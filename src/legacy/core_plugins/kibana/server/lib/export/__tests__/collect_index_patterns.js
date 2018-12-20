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
import { collectIndexPatterns } from '../collect_index_patterns';
import { expect } from 'chai';

describe('collectIndexPatterns(req, panels)', () => {
  const panels = [
    {
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({ index: 'index-*' })
        }
      }
    }, {
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({ index: 'logstash-*' })
        }
      }
    }, {
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({ index: 'logstash-*' })
        }
      }
    }, {
      attributes: {
        savedSearchId: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({ index: 'bad-*' })
        }
      }
    }
  ];

  const savedObjectsClient = { bulkGet: sinon.stub() };

  beforeEach(() => {
    savedObjectsClient.bulkGet.returns(Promise.resolve({
      saved_objects: [
        { id: 'index-*' }, { id: 'logstash-*' }
      ]
    }));
  });

  afterEach(() => {
    savedObjectsClient.bulkGet.resetHistory();
  });

  it('should request all index patterns', async () => {
    await collectIndexPatterns(savedObjectsClient, panels);

    expect(savedObjectsClient.bulkGet.calledOnce).to.equal(true);
    expect(savedObjectsClient.bulkGet.getCall(0).args[0]).to.eql([{
      id: 'index-*',
      type: 'index-pattern'
    }, {
      id: 'logstash-*',
      type: 'index-pattern'
    }]);
  });

  it('should return the index pattern docs', async () => {
    const results = await collectIndexPatterns(savedObjectsClient, panels);

    expect(results).to.eql([
      { id: 'index-*' },
      { id: 'logstash-*' }
    ]);
  });

  it('should return an empty array if nothing is requested', async () => {
    const input = [
      {
        attributes: {
          savedSearchId: 1,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ index: 'bad-*' })
          }
        }
      }
    ];

    const results = await collectIndexPatterns(savedObjectsClient, input);
    expect(results).to.eql([]);
    expect(savedObjectsClient.bulkGet.calledOnce).to.eql(false);
  });
});
