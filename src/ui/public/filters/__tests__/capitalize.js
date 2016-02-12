import angular from 'angular';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ngMock';
import 'ui/filters/capitalize';

var filter;

var strings = [
  'capitalize',
  'saved searches',
  'an awesome visualization',
  'saved searches of the tenth degree',
  'the title'
];

var notAString = 10;

var init = function (expandable) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('capitalize');
  });
};

describe('capitalize filter', function () {

  beforeEach(function () {
    init();
  });

  it('should have a capitalize filter', function () {
    expect(filter).to.not.be(null);
  });

  it('should not capitalize certain words', function () {});

  it('should always capitalize the first letter of the first word of a title', function () {});

  it('should capitalize the first letter of a qualified string', function () {
    expect(filter(string).charAt(0)).to.be(string.charAt(0).toUpperCase());
  });

  it('should simply return non-string types', function () {
    expect(filter(notAString)).to.be(notAString);
  });
});
