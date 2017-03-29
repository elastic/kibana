import expect from 'expect.js';
import _ from 'lodash';
import ngMock from 'ng_mock';
import 'plugins/kibana/discover/index';
import 'ui/filters/field_type';

let filter;

let types;

const init = function () {
  // Load the application
  ngMock.module('kibana');

  types = [
    { name: 's1', type: 'string' },
    { name: 's2', type: 'string' },
    { name: 's3', type: 'string' },

    { name: 'n1', type: 'number' },
    { name: 'n2', type: 'number' },

    { name: 'i1', type: 'ip' },
    { name: 'd1', type: 'date' },
  ];

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('fieldType');
  });
};


describe('fieldType array filter', function () {

  beforeEach(function () {
    init();
  });

  it('should have a fieldType filter', function () {
    expect(filter).to.not.be(null);
  });

  it('should have 3 string fields', function () {
    expect(filter(types, 'string').length).to.be(3);
  });

  it('should have 2 number fields', function () {
    expect(filter(types, 'number').length).to.be(2);
  });

  it('should have 1 ip field and 1 date field', function () {
    expect(_.pluck(filter(types, ['date', 'ip']), 'name')).to.eql(['i1', 'd1']);
  });

  it('should return all fields when passed *', function () {
    expect(filter(types, '*').length).to.be(7);
  });

  it('should allow negation', function () {
    const resultNames = _.pluck(filter(types, '!string'), 'name');
    expect(resultNames).to.eql(['n1', 'n2', 'i1', 'd1']);
  });
});
