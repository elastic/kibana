import sinon from 'sinon';
import collectPanels, { deps } from '../collect_panels';
import { expect } from 'chai';

describe('collectPanels(req, dashboard)', () => {
  let req;
  let requestStub;
  let collectSearchSourcesStub;
  let collectIndexPatternsStub;
  let dashboard;

  beforeEach(() => {
    dashboard = {
      _source: {
        panelsJSON: JSON.stringify([
          { id: 'panel-01', type: 'search' },
          { id: 'panel-02', type: 'visualization' }
        ])
      }
    };

    requestStub = sinon.stub().returns(Promise.resolve({
      docs: [ { _id: 'panel-01' }, { _id: 'panel-02' } ]
    }));

    collectIndexPatternsStub = sinon.stub(deps, 'collectIndexPatterns');
    collectIndexPatternsStub.returns([{ _id: 'logstash-*' }]);
    collectSearchSourcesStub = sinon.stub(deps, 'collectSearchSources');
    collectSearchSourcesStub.returns([ { _id: 'search-01' }]);

    req = {
      server: {
        config: () => ({ get: () => '.kibana' }),
        plugins: {
          elasticsearch: {
            getCluster: () => ({ callWithRequest: requestStub })
          }
        }
      }
    };
  });

  afterEach(() => {
    collectSearchSourcesStub.restore();
    collectIndexPatternsStub.restore();
  });

  it('should request each panel in the panelJSON', () => {
    return collectPanels(req, dashboard)
      .then(() => {
        expect(requestStub.calledOnce).to.equal(true);
        expect(requestStub.args[0][1]).to.equal('mget');
        expect(requestStub.args[0][2]).to.eql({
          body: {
            docs: [
              {
                _index: '.kibana',
                _type: 'search',
                _id: 'panel-01'
              },
              {
                _index: '.kibana',
                _type: 'visualization',
                _id: 'panel-02'
              }
            ]
          }
        });
      });
  });

  it('should call collectSearchSources()', () => {
    return collectPanels(req, dashboard).then(() => {
      expect(collectSearchSourcesStub.calledOnce).to.equal(true);
      expect(collectSearchSourcesStub.args[0][1]).to.eql([
        { _id: 'panel-01' },
        { _id: 'panel-02' }
      ]);
    });
  });

  it('should call collectIndexPatterns()', () => {
    return collectPanels(req, dashboard).then(() => {
      expect(collectIndexPatternsStub.calledOnce).to.equal(true);
      expect(collectIndexPatternsStub.args[0][1]).to.eql([
        { _id: 'panel-01' },
        { _id: 'panel-02' }
      ]);
    });
  });

  it('should return panels, index patterns, search sources, and dashboard', () => {
    return collectPanels(req, dashboard).then((results) => {
      expect(results).to.eql([
        { _id: 'panel-01' },
        { _id: 'panel-02' },
        { _id: 'logstash-*' },
        { _id: 'search-01' },
        dashboard
      ]);
    });
  });

});

