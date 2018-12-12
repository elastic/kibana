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
import * as collectIndexPatternsDep from '../collect_index_patterns';
import * as collectSearchSourcesDep from '../collect_search_sources';
import { collectPanels } from '../collect_panels';
import { expect } from 'chai';

describe('collectPanels(req, dashboard)', () => {
  let collectSearchSourcesStub;
  let collectIndexPatternsStub;
  let dashboard;

  const savedObjectsClient = { bulkGet: sinon.stub() };

  beforeEach(() => {
    dashboard = {
      attributes: {
        panelsJSON: JSON.stringify([
          { id: 'panel-01', type: 'search' },
          { id: 'panel-02', type: 'visualization' }
        ])
      }
    };

    savedObjectsClient.bulkGet.returns(Promise.resolve({
      saved_objects: [
        { id: 'panel-01' }, { id: 'panel-02' }
      ]
    }));

    collectIndexPatternsStub = sinon.stub(collectIndexPatternsDep, 'collectIndexPatterns');
    collectIndexPatternsStub.returns([{ id: 'logstash-*' }]);
    collectSearchSourcesStub = sinon.stub(collectSearchSourcesDep, 'collectSearchSources');
    collectSearchSourcesStub.returns([ { id: 'search-01' }]);
  });

  afterEach(() => {
    collectSearchSourcesStub.restore();
    collectIndexPatternsStub.restore();
    savedObjectsClient.bulkGet.resetHistory();
  });

  it('should request each panel in the panelJSON', async () => {
    await collectPanels(savedObjectsClient, dashboard);

    expect(savedObjectsClient.bulkGet.calledOnce).to.equal(true);
    expect(savedObjectsClient.bulkGet.getCall(0).args[0]).to.eql([{
      id: 'panel-01',
      type: 'search'
    }, {
      id: 'panel-02',
      type: 'visualization'
    }]);
  });

  it('should call collectSearchSources()', async () => {
    await collectPanels(savedObjectsClient, dashboard);
    expect(collectSearchSourcesStub.calledOnce).to.equal(true);
    expect(collectSearchSourcesStub.args[0][1]).to.eql([
      { id: 'panel-01' },
      { id: 'panel-02' }
    ]);
  });

  it('should call collectIndexPatterns()', async () => {
    await collectPanels(savedObjectsClient, dashboard);

    expect(collectIndexPatternsStub.calledOnce).to.equal(true);
    expect(collectIndexPatternsStub.args[0][1]).to.eql([
      { id: 'panel-01' },
      { id: 'panel-02' }
    ]);
  });

  it('should return panels, index patterns, search sources, and dashboard', async () => {
    const results = await collectPanels(savedObjectsClient, dashboard);

    expect(results).to.eql([
      { id: 'panel-01' },
      { id: 'panel-02' },
      { id: 'logstash-*' },
      { id: 'search-01' },
      dashboard
    ]);
  });

});
