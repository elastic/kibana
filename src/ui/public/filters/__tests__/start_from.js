import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'ui/filters/start_from';


let filter;

const init = function () {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('startFrom');
  });
};

describe('startFrom array filter', function () {

  beforeEach(function () {
    init();
  });

  it('should have a startFrom filter', function () {
    expect(filter).to.not.be(null);
  });

  it('should return an empty array if passed undefined', function () {
    expect(filter(undefined, 10)).to.eql([]);
  });

  it('should return an array with the first 3 elements removed', function () {
    expect(filter([1, 2, 3, 4, 5, 6, 7, 8, 9], 3).length).to.be(6);
  });

});
