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

  const savedObjectsClient = { bulkGet: sinon.mock() };

  beforeEach(() => {
    savedObjectsClient.bulkGet.returns(Promise.resolve([
      { id: 'index-*' }, { id: 'logstash-*' }
    ]));
  });

  afterEach(() => {
    savedObjectsClient.bulkGet.reset();
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
