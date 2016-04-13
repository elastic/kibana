let angular = require('angular');
let $ = require('jquery');
let expect = require('expect.js');
let ngMock = require('ngMock');
require('plugins/kibana/discover/index');

let $parentScope;

let $scope;

let $elem;

let init = function (expandable) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($rootScope, $compile) {

    // Give us a scope
    $parentScope = $rootScope;

    // Create the element
    $elem = angular.element(
      '<span css-truncate ' + (expandable ? 'css-truncate-expandable' : '') + '>this isnt important</span>'
    );

    // And compile it
    $compile($elem)($parentScope);

    // Fire a digest cycle
    $elem.scope().$digest();

    // Grab the isolate scope so we can test it
    $scope = $elem.isolateScope();
  });
};


describe('cssTruncate directive', function () {

  describe('expandable', function () {

    beforeEach(function () {
      init(true);
    });

    it('should set text-overflow to ellipsis and whitespace to nowrap', function (done) {
      expect($elem.css('text-overflow')).to.be('ellipsis');
      expect($elem.css('white-space')).to.be('nowrap');
      done();
    });

    it('should set white-space to normal when clicked, and back to nowrap when clicked again', function (done) {
      $scope.toggle();
      expect($elem.css('white-space')).to.be('normal');

      $scope.toggle();
      expect($elem.css('white-space')).to.be('nowrap');
      done();
    });

  });

});
