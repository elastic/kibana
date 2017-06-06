import sinon from 'sinon';
import * as collectIndexPatternsDep from '../collect_index_patterns';
import * as collectSearchSourcesDep from '../collect_search_sources';
import { collectPanels } from '../collect_panels';
import { expect } from 'chai';

describe('collectPanels(req, dashboard)', () => {
  let collectSearchSourcesStub;
  let collectIndexPatternsStub;
  let dashboard;

  const savedObjectsClient = { bulkGet: sinon.mock() };

  beforeEach(() => {
    dashboard = {
      attributes: {
        panelsJSON: JSON.stringify([
          { id: 'panel-01', type: 'search' },
          { id: 'panel-02', type: 'visualization' }
        ])
      }
    };

    savedObjectsClient.bulkGet.returns(Promise.resolve([
      { id: 'panel-01' }, { id: 'panel-02' }
    ]));

    collectIndexPatternsStub = sinon.stub(collectIndexPatternsDep, 'collectIndexPatterns');
    collectIndexPatternsStub.returns([{ id: 'logstash-*' }]);
    collectSearchSourcesStub = sinon.stub(collectSearchSourcesDep, 'collectSearchSources');
    collectSearchSourcesStub.returns([ { id: 'search-01' }]);
  });

  afterEach(() => {
    collectSearchSourcesStub.restore();
    collectIndexPatternsStub.restore();
    savedObjectsClient.bulkGet.reset();
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
