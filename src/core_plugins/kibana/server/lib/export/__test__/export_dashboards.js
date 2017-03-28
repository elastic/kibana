import exportDashboards, { deps } from '../export_dashboards';
import sinon from 'sinon';
import { expect } from 'chai';

describe('exportDashboards(req)', () => {

  let req;
  let collectDashboardsStub;
  beforeEach(() => {
    req = {
      payload: [ 'dasboard-01' ],
      server: {
        config: () => ({ get: () => '6.0.0' }),
      }
    };

    collectDashboardsStub = sinon.stub(deps, 'collectDashboards');
    collectDashboardsStub.returns(Promise.resolve([
      { _id: 'dasboard-01' },
      { _id: 'logstash-*' },
      { _id: 'panel-01' }
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
        { _id: 'dasboard-01' },
        { _id: 'logstash-*' },
        { _id: 'panel-01' }
      ]);
    });
  });



});
