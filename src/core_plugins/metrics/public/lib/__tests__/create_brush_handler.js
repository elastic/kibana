import createBrushHandler from '../create_brush_handler';
import sinon from 'sinon';
import moment from 'moment';
import { expect } from 'chai';

describe('createBrushHandler', () => {

  let evalAsyncStub;
  let $scope;
  let timefilter;
  let fn;
  let range;

  beforeEach(() => {
    evalAsyncStub = sinon.stub().yields();
    $scope = { $evalAsync: evalAsyncStub };
    timefilter = { time: {} };
    fn = createBrushHandler($scope, timefilter);
    range = { xaxis: { from: '2017-01-01T00:00:00Z', to: '2017-01-01T00:10:00Z' } };
    fn(range);
  });

  it('returns brushHandler() that calls $scope.$evalAsync()', () => {
    expect(evalAsyncStub.calledOnce).to.equal(true);
  });

  it('returns brushHandler() that updates timefilter', () => {
    expect(timefilter.time.from).to.equal(moment(range.xaxis.from).toISOString());
    expect(timefilter.time.to).to.equal(moment(range.xaxis.to).toISOString());
    expect(timefilter.time.mode).to.equal('absolute');
  });

});
