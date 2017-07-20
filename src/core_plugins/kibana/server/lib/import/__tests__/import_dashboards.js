import { importDashboards } from '../import_dashboards';
import sinon from 'sinon';
import { expect } from 'chai';

describe('importDashboards(req)', () => {

  let req;
  let bulkCreateStub;
  beforeEach(() => {
    bulkCreateStub = sinon.stub().returns(Promise.resolve());
    req = {
      query: {},
      payload: {
        version: '6.0.0',
        objects: [
          { id: 'dashboard-01', type: 'dashboard', attributes: { panelJSON: '{}' } },
          { id: 'panel-01', type: 'visualization', attributes: { visState: '{}' } },
        ]
      },
      getSavedObjectsClient() {
        return {
          bulkCreate: bulkCreateStub
        };
      },
    };

  });

  it('should call bulkCreate with each asset', () => {
    return importDashboards(req).then(() => {
      expect(bulkCreateStub.calledOnce).to.equal(true);
      expect(bulkCreateStub.args[0][0]).to.eql([
        { id: 'dashboard-01', type: 'dashboard', attributes: { panelJSON: '{}' } },
        { id: 'panel-01', type: 'visualization', attributes: { visState: '{}' } },
      ]);
    });
  });

  it('should call bulkCreate with overwrite true if force is truthy', () => {
    req.query = { force: 'true' };
    return importDashboards(req).then(() => {
      expect(bulkCreateStub.calledOnce).to.equal(true);
      expect(bulkCreateStub.args[0][1]).to.eql({ overwrite: true });
    });
  });

  it('should exclude types based on exclude argument', () => {
    req.query = { exclude: 'visualization' };
    return importDashboards(req).then(() => {
      expect(bulkCreateStub.calledOnce).to.equal(true);
      expect(bulkCreateStub.args[0][0]).to.eql([
        { id: 'dashboard-01', type: 'dashboard', attributes: { panelJSON: '{}' } },
      ]);
    });
  });

});
