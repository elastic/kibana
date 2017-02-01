import angular from 'angular';
import expect from 'expect.js';
import _ from 'lodash';
import faker from 'faker';
import ngMock from 'ng_mock';
import 'plugins/kibana/discover/index';

// Load kibana and its applications

let filter;

const init = function (expandable) {
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
