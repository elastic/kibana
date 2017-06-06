import * as deps from '../collect_dashboards';
import { exportDashboards } from '../export_dashboards';
import sinon from 'sinon';
import { expect } from 'chai';

describe('exportDashboards(req)', () => {

  let req;
  let collectDashboardsStub;

  beforeEach(() => {
    req = {
      query: { dashboard: 'dashboard-01' },
      server: {
        config: () => ({ get: () => '6.0.0' }),
        plugins: {
          elasticsearch: {
            getCluster: () => ({ callWithRequest: sinon.stub() })
          }
        },
      }
    };

    collectDashboardsStub = sinon.stub(deps, 'collectDashboards');
    collectDashboardsStub.returns(Promise.resolve([
      { id: 'dasboard-01' },
      { id: 'logstash-*' },
      { id: 'panel-01' }
    ]));
  });

  afterEach(() => {
    collectDashboardsStub.restore();
  });

  it('should return a response object with version', () => {
    return exportDashboards(req).then((resp) => {
      expect(resp).to.have.property('version', '6.0.0');
    });
  });

  it('should return a response object with objects', () => {
    return exportDashboards(req).then((resp) => {
      expect(resp).to.have.property('objects');
      expect(resp.objects).to.eql([
        { id: 'dasboard-01' },
        { id: 'logstash-*' },
        { id: 'panel-01' }
      ]);
    });
  });
});
