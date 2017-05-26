import sinon from 'sinon';
import collectDashboards, { deps } from '../collect_dashboards';
import { expect } from 'chai';

describe('collectDashboards(req, ids)', () => {

  let req;
  let requestStub;
  let collectPanelsStub;
  beforeEach(() => {
    requestStub = sinon.stub().returns(Promise.resolve({
      docs: [ { _id: 'dashboard-01', found: true }, { _id: 'dashboard-02', found: true } ]
    }));

    collectPanelsStub = sinon.stub(deps, 'collectPanels');
    collectPanelsStub.onFirstCall().returns(Promise.resolve([
      { _id: 'dashboard-01', found: true },
      { _id: 'panel-01', found: true },
      { _id: 'index-*', found: true }
    ]));
    collectPanelsStub.onSecondCall().returns(Promise.resolve([
      { _id: 'dashboard-02', found: true },
      { _id: 'panel-01', found: true },
      { _id: 'index-*', found: true }
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
        expect(collectPanelsStub.args[0][1]).to.eql({ _id: 'dashboard-01', found: true });
        expect(collectPanelsStub.args[1][1]).to.eql({ _id: 'dashboard-02', found: true });
      });
  });

  it('should return an unique list of objects', () => {
    return collectDashboards(req, ['dashboard-01', 'dashboard-02'])
      .then(results => {
        expect(results).to.eql([
          { _id: 'dashboard-01', found: true },
          { _id: 'panel-01', found: true },
          { _id: 'index-*', found: true },
          { _id: 'dashboard-02', found: true },
        ]);
      });
  });

});

