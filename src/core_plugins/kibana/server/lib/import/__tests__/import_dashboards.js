import { importDashboards } from '../import_dashboards';
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
      query: {},
      payload: {
        version: '6.0.0',
        objects: [
          { id: 'dashboard-01', type: 'dashboard', attributes: { panelJSON: '{}' } },
          { id: 'panel-01', type: 'visualization', attributes: { visState: '{}' } }
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

  it('should throw an error if the version doesn\'t match', () => {
    req.payload.version = '5.5.0';
    return importDashboards(req).catch((err) => {
      expect(err).to.have.property('message', 'Version 5.5.0 does not match 6.0.0.');
    });
  });

  it('should make a bulk request to create each asset', () => {
    return importDashboards(req).then(() => {
      expect(requestStub.calledOnce).to.equal(true);
      expect(requestStub.args[0][1]).to.equal('bulk');
      expect(requestStub.args[0][2]).to.eql({
        body: [
          { create: { _type: 'dashboard', _id: 'dashboard-01' } },
          { panelJSON: '{}' },
          { create: { _type: 'visualization', _id: 'panel-01' } },
          { visState: '{}' }
        ],
        index: '.kibana'
      });
    });
  });

  it('should make a bulk request index each asset if force is truthy', () => {
    req.query = { force: 'true' };
    return importDashboards(req).then(() => {
      expect(requestStub.calledOnce).to.equal(true);
      expect(requestStub.args[0][1]).to.equal('bulk');
      expect(requestStub.args[0][2]).to.eql({
        body: [
          { index: { _type: 'dashboard', _id: 'dashboard-01' } },
          { panelJSON: '{}' },
          { index: { _type: 'visualization', _id: 'panel-01' } },
          { visState: '{}' }
        ],
        index: '.kibana'
      });
    });
  });

  it('should exclude types based on exclude argument', () => {
    req.query = { exclude: 'visualization' };
    return importDashboards(req).then(() => {
      expect(requestStub.calledOnce).to.equal(true);
      expect(requestStub.args[0][1]).to.equal('bulk');
      expect(requestStub.args[0][2]).to.eql({
        body: [
          { create: { _type: 'dashboard', _id: 'dashboard-01' } },
          { panelJSON: '{}' }
        ],
        index: '.kibana'
      });
    });
  });

});
