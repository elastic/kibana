import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'plugins/kibana/discover/index';

// Load kibana and its applications

let rison;
let risonDecode;

let init = function (expandable) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    rison = $filter('rison');
    risonDecode = $filter('risonDecode');
  });
};

describe('rison filters', function () {
  let testObj = {
    time: {
      from: 'now-15m',
      to: 'now'
    }
  };
  let testRison = '(time:(from:now-15m,to:now))';

  beforeEach(function () {
    init();
  });

  describe('rison', function () {
    it('should have the filter', function () {
      expect(rison).to.not.be(null);
    });

    it('should rison encode data', function () {
      expect(rison(testObj)).to.be(testRison);
    });
  });

  describe('risonDecode', function () {
    it('should have the filter', function () {
      expect(risonDecode).to.not.be(null);
    });

    it('should decode rison data', function () {
      expect(risonDecode(testRison)).to.eql(testObj);
    });
  });
});
