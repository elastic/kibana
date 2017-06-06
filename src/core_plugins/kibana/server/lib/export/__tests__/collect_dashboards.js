import sinon from 'sinon';
import * as deps from '../collect_panels';
import { collectDashboards } from '../collect_dashboards';
import { expect } from 'chai';

describe('collectDashboards(req, ids)', () => {

  let collectPanelsStub;
  const savedObjectsClient = { bulkGet: sinon.mock() };

  const ids = ['dashboard-01', 'dashboard-02'];

  beforeEach(() => {
    collectPanelsStub = sinon.stub(deps, 'collectPanels');
    collectPanelsStub.onFirstCall().returns(Promise.resolve([
      { id: 'dashboard-01' },
      { id: 'panel-01' },
      { id: 'index-*' }
    ]));
    collectPanelsStub.onSecondCall().returns(Promise.resolve([
      { id: 'dashboard-02' },
      { id: 'panel-01' },
      { id: 'index-*' }
    ]));

    savedObjectsClient.bulkGet.returns(Promise.resolve([
      { id: 'dashboard-01' }, { id: 'dashboard-02' }
    ]));
  });

  afterEach(() => {
    collectPanelsStub.restore();
    savedObjectsClient.bulkGet.reset();
  });

  it('should request all dashboards', async () => {
    await collectDashboards(savedObjectsClient, ids);

    expect(savedObjectsClient.bulkGet.calledOnce).to.equal(true);

    const args = savedObjectsClient.bulkGet.getCall(0).args;
    expect(args[0]).to.eql([{
      id: 'dashboard-01',
      type: 'dashboard'
    }, {
      id: 'dashboard-02',
      type: 'dashboard'
    }]);
  });

  it('should call collectPanels with dashboard docs', async () => {
    await collectDashboards(savedObjectsClient, ids);

    expect(collectPanelsStub.calledTwice).to.equal(true);
    expect(collectPanelsStub.args[0][1]).to.eql({ id: 'dashboard-01' });
    expect(collectPanelsStub.args[1][1]).to.eql({ id: 'dashboard-02' });
  });

  it('should return an unique list of objects', async () => {
    const results = await collectDashboards(savedObjectsClient, ids);
    expect(results).to.eql([
      { id: 'dashboard-01' },
      { id: 'panel-01' },
      { id: 'index-*' },
      { id: 'dashboard-02' },
    ]);
  });
});
