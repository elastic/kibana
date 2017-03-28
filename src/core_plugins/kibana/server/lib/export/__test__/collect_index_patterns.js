import sinon from 'sinon';
import collectIndexPatterns from '../collect_index_patterns';
import { expect } from 'chai';
describe('collectIndexPatterns(req, panels)', () => {
  let req;
  let panels;
  let requestStub;
  beforeEach(() => {
    panels = [
      {
        _source: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ index: 'index-*' })
          }
        }
      },
      {
        _source: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ index: 'logstash-*' })
          }
        }
      },
      {
        _source: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ index: 'logstash-*' })
          }
        }
      },
      {
        _source: {
          savedSearchId: 1,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ index: 'bad-*' })
          }
        }
      }
    ];

    requestStub = sinon.stub().returns(Promise.resolve({
      docs: [ { _id: 'index-*' }, { _id: 'logstash-*' } ]
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

  it('should request all index patterns', () => {
    return collectIndexPatterns(req, panels)
      .then(() => {
        expect(requestStub.calledOnce).to.equal(true);
        expect(requestStub.args[0][1]).to.equal('mget');
        expect(requestStub.args[0][2]).to.eql({
          index: '.kibana',
          type: 'index-pattern',
          body:{ ids: ['index-*', 'logstash-*'] }
        });
      });
  });

  it('should return the index pattern docs', () => {
    return collectIndexPatterns(req, panels)
      .then((results) => {
        expect(results).to.eql([
          { _id: 'index-*' },
          { _id: 'logstash-*' }
        ]);
      });
  });

  it('should return an empty array if nothing is requested', () => {
    const input = [
      {
        _source: {
          savedSearchId: 1,
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ index: 'bad-*' })
          }
        }
      }
    ];
    return collectIndexPatterns(req, input)
      .then((results) => {
        expect(requestStub.calledOnce).to.eql(false);
        expect(results).to.eql([]);
      });
  });


});
