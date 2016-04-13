let angular = require('angular');
let expect = require('expect.js');
let _ = require('lodash');
let faker = require('faker');
let ngMock = require('ngMock');

// Load kibana and its applications
require('plugins/kibana/discover/index');

let filter;

let init = function (expandable) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('label');
  });
};

describe('label filter', function () {
  beforeEach(function () {
    init();
  });

  it('should have a label filter', function () {
    expect(filter).to.not.be(null);
  });

  it('should capitalize the first letter in a string', function () {
    expect(filter('something')).to.be('Something');
  });

  it('should capitalize the first letter in every word', function () {
    expect(filter('foo bar fizz buzz')).to.be('Foo Bar Fizz Buzz');
  });
});
