import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'plugins/kibana/discover/index';


let $parentScope;

let $scope;

let $elem;

const init = function (text) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($rootScope, $compile) {

    // Give us a scope
    $parentScope = $rootScope;

    // Create the element
    $elem = angular.element(
      '<kbn-truncated source="' + text + '" length="10"></kbn-truncated>'
    );

    // And compile it
    $compile($elem)($parentScope);

    // Fire a digest cycle
    $elem.scope().$digest();

    // Grab the isolate scope so we can test it
    $scope = $elem.isolateScope();
  });
};

function trimmed(text) {
  return text.trim().replace(/\s+/g, ' ');
}

describe('kbnTruncate directive', function () {

  describe('long strings', function () {

    beforeEach(function () {
      init('some string of text over 10 characters');
    });

    it('should trim long strings', function (done) {
      expect(trimmed($elem.text())).to.be('some … more');
      done();
    });

    it('should have a link to see more text', function (done) {
      expect($elem.find('[ng-click="toggle()"]').text()).to.be('more');
      done();
    });

    it('should show more text if the link is clicked and less text if clicked again', function (done) {
      $scope.toggle();
      $scope.$digest();
      expect(trimmed($elem.text())).to.be('some string of text over 10 characters less');
      expect($elem.find('[ng-click="toggle()"]').text()).to.be('less');

      $scope.toggle();
      $scope.$digest();
      expect(trimmed($elem.text())).to.be('some … more');
      expect($elem.find('[ng-click="toggle()"]').text()).to.be('more');

      done();
    });

  });

  describe('short strings', function () {

    beforeEach(function () {
      init('short');
    });

    it('should not trim short strings', function (done) {
      expect(trimmed($elem.text())).to.be('short');
      done();
    });

    it('should not have a link', function (done) {
      expect($elem.find('[ng-click="toggle()"]').length).to.be(0);
      done();
    });

  });

});
