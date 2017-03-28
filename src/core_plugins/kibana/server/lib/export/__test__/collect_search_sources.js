import sinon from 'sinon';
import collectSearchSources, { deps } from '../collect_search_sources';
import { expect } from 'chai';
describe('collectSearchSources(req, panels)', () => {
  let req;
  let panels;
  let requestStub;
  let collectIndexPatternsStub;
  beforeEach(() => {
    panels = [
      { _source: { savedSearchId: 1 } },
      { _source: { savedSearchId: 2 } }
    ];

    collectIndexPatternsStub = sinon.stub(deps, 'collectIndexPatterns');
    collectIndexPatternsStub.returns(Promise.resolve([{ _id: 'logstash-*' }]));

    requestStub = sinon.stub().returns(Promise.resolve({
      docs: [ { _id: 1 }, { _id: 2 } ]
    }));

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
    collectIndexPatternsStub.restore();
  });

  it('should request all search sources', () => {
    return collectSearchSources(req, panels)
      .then(() => {
        expect(requestStub.calledOnce).to.equal(true);
        expect(requestStub.args[0][1]).to.equal('mget');
        expect(requestStub.args[0][2]).to.eql({
          index: '.kibana',
          type: 'search',
          body:{ ids: [1, 2] }
        });
      });
  });

  it('should return the search source and index patterns', () => {
    return collectSearchSources(req, panels)
      .then((results) => {
        expect(results).to.eql([
          { _id: 1 },
          { _id: 2 },
          { _id: 'logstash-*' }
        ]);
      });
  });

  it('should return an empty array if nothing is requested', () => {
    const input = [
      {
        _source: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ index: 'bad-*' })
          }
        }
      }
    ];
    return collectSearchSources(req, input)
      .then((results) => {
        expect(requestStub.calledOnce).to.eql(false);
        expect(results).to.eql([]);
      });
  });
});
