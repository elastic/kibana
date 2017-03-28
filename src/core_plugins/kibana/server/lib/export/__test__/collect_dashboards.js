import sinon from 'sinon';
import collectDashboards, { deps } from '../collect_dashboards';
import { expect } from 'chai';

describe('collectDashbaords(req, ids)', () => {

  let req;
  let requestStub;
  let collectPanelsStub;
  beforeEach(() => {
    requestStub = sinon.stub().returns(Promise.resolve({
      docs: [ { _id: 'dashboard-01' }, { _id: 'dashboard-02' } ]
    }));

    collectPanelsStub = sinon.stub(deps, 'collectPanels');
    collectPanelsStub.onFirstCall().returns(Promise.resolve([
      { _id: 'dashboard-01' },
      { _id: 'panel-01' },
      { _id: 'index-*' }
    ]));
    collectPanelsStub.onSecondCall().returns(Promise.resolve([
      { _id: 'dashboard-02' },
      { _id: 'panel-01' },
      { _id: 'index-*' }
    ]));

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
    collectPanelsStub.restore();
  });

  it ('should request all dashboards', () => {
    return collectDashboards(req, ['dashboard-01', 'dashboard-02'])
      .then(() => {
        expect(requestStub.calledOnce).to.equal(true);
        expect(requestStub.args[0][1]).to.equal('mget');
        expect(requestStub.args[0][2]).to.eql({
          body: {
            ids: ['dashboard-01', 'dashboard-02']
          },
          index: '.kibana',
          type: 'dashboard'
        });
      });
  });

  it('should call collectPanels with dashboard docs', () => {
    return collectDashboards(req, ['dashboard-01', 'dashboard-02'])
      .then(() => {
        expect(collectPanelsStub.calledTwice).to.equal(true);
        expect(collectPanelsStub.args[0][1]).to.eql({ _id: 'dashboard-01' });
        expect(collectPanelsStub.args[1][1]).to.eql({ _id: 'dashboard-02' });
      });
  });

  it('should return an unique list of objects', () => {
    return collectDashboards(req, ['dashboard-01', 'dashboard-02'])
      .then(results => {
        expect(results).to.eql([
          { _id: 'dashboard-01' },
          { _id: 'panel-01' },
          { _id: 'index-*' },
          { _id: 'dashboard-02' },
        ]);
      });
  });

});

