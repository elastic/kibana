var angular = require('angular');
var $ = require('jquery');
var expect = require('expect.js');
var ngMock = require('ngMock');

require('plugins/kibana/discover/index');

var $parentScope, $scope, $elem;

var init = function () {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($rootScope, $compile) {

    // Give us a scope
    $parentScope = $rootScope;

    // Create the element
    $elem = angular.element(
      '<span class="spinner"></span>'
    );

    // And compile it
    $compile($elem)($parentScope);

    // Fire a digest cycle
    $elem.scope().$digest();

    // Grab the isolate scope so we can test it
    $scope = $elem.isolateScope();
  });
};


describe('spinner directive', function () {

  beforeEach(function () {
    init();
  });

  it('should contain 3 divs', function (done) {
    expect($elem.children('div').length).to.be(3);
    done();
  });

});
