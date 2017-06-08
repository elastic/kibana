import sinon from 'sinon';
import * as deps from '../collect_index_patterns';
import { collectSearchSources } from '../collect_search_sources';
import { expect } from 'chai';
describe('collectSearchSources(req, panels)', () => {
  const savedObjectsClient = { bulkGet: sinon.mock() };

  let panels;
  let collectIndexPatternsStub;

  beforeEach(() => {
    panels = [
      { attributes: { savedSearchId: 1 } },
      { attributes: { savedSearchId: 2 } }
    ];

    collectIndexPatternsStub = sinon.stub(deps, 'collectIndexPatterns');
    collectIndexPatternsStub.returns(Promise.resolve([{ id: 'logstash-*' }]));

    savedObjectsClient.bulkGet.returns(Promise.resolve([
      { id: 1 }, { id: 2 }
    ]));
  });

  afterEach(() => {
    collectIndexPatternsStub.restore();
    savedObjectsClient.bulkGet.reset();
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
