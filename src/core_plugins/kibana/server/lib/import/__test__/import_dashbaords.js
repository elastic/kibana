import importDashboards from '../import_dashboards';
import sinon from 'sinon';
import { expect } from 'chai';

describe('importDashboards(req)', () => {

  let req;
  let requestStub;
  beforeEach(() => {
    requestStub = sinon.stub().returns(Promise.resolve({
      responses: []
    }));

    req = {
      payload: {
        version: '6.0.0',
        objects: [
          { _id: 'dashboard-01', _type: 'dashboard', _source: { panelJSON: '{}' } },
          { _id: 'panel-01', _type: 'visualization', _source: { visState: '{}' } },
          { _id: 'bad-01', _type: 'bad', _source: { somethingJSON: '{}' } }
        ]
      },
      server: {
        config: () => ({ get: (id) => {
          switch(id) {
            case 'kibana.index':
              return '.kibana';
            case 'pkg.version':
              return '6.0.0';
            default:
              throw new Error(`${id} is not available`);
          }
        } }),
        plugins: {
          elasticsearch: {
            getCluster: () => ({ callWithRequest: requestStub })
          }
        }
      }
    };

  });

  it('should thorw an error if the version doesn\'t match', () => {
    req.payload.version = '5.5.0';
    return importDashboards(req).catch((err) => {
      expect(err).to.have.property('message', 'Version 5.5.0 does not match 6.0.0.');
    });
  });

  it('should make a bulk request with each asset', () => {
    return importDashboards(req).then(() => {
      expect(requestStub.calledOnce).to.equal(true);
      expect(requestStub.args[0][1]).to.equal('bulk');
      expect(requestStub.args[0][2]).to.eql({
        body: [
          { create: { _index: '.kibana', _type: 'dashboard', _id: 'dashboard-01' } },
          { panelJSON: '{}' },
          { create: { _index: '.kibana', _type: 'visualization', _id: 'panel-01' } },
          { visState: '{}' }
        ]
      });
    });

  });

});

