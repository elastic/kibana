import angular from 'angular';
import expect from 'expect.js';
import _ from 'lodash';
import ngMock from 'ng_mock';
import 'plugins/kibana/discover/index';


let filter;

let init = function (expandable) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('uriescape');
  });
};


describe('uriescape filter', function () {

  beforeEach(function () {
    init();
  });

  it('should have a uriescape filter', function () {
    expect(filter).to.not.be(null);
  });

  it('should encodeURIComponent a string', function () {
    expect(filter('this and that')).to.be('this%20and%20that');
  });

});
