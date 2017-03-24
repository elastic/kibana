import expect from 'expect.js';
import sinon from 'auto-release-sinon';
import moment from 'moment';
import ngMock from 'ng_mock';
import 'ui/filters/moment';


let filter;
const anchor = '2014-01-01T06:06:06.666';

const init = function () {
  // Load the application
  ngMock.module('kibana');
  sinon.useFakeTimers(moment(anchor).valueOf());

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('moment');
  });
};


describe('moment formatting filter', function () {

  beforeEach(function () {
    init();
  });

  it('should have a moment filter', function () {
    expect(filter).to.not.be(null);
  });

  // MMMM Do YYYY, HH:mm:ss.SSS
  it('should format moments', function () {
    expect(filter(moment())).to.be('January 1st 2014, 06:06:06.666');
  });

  it('should format dates', function () {
    expect(filter(new Date())).to.be('January 1st 2014, 06:06:06.666');
  });

  it('should return the original value if passed anything other than a moment or Date', function () {
    expect(filter('beer')).to.be('beer');
    expect(filter(1)).to.be(1);
    expect(filter([])).to.eql([]);
  });
});
