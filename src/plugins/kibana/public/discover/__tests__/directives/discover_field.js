
var angular = require('angular');
var $ = require('jquery');
var _ = require('lodash');
var sinon = require('auto-release-sinon');
var ngMock = require('ngMock');
var expect = require('expect.js');

// Load the kibana app dependencies.
require('ui/private');
require('plugins/kibana/discover/components/field_chooser/discover_field');

describe('discoverField', function () {
  var $scope;
  var indexPattern;
  var $elem;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $rootScope, $compile) {
    $elem = angular.element('<discover-field></discover-field>');
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));

    _.assign($rootScope, {
      field: indexPattern.fields.byName.extension,
      increaseFieldCounter: sinon.spy(),
      toggle: function (field) {
        indexPattern.fields.byName[field].display = !indexPattern.fields.byName[field].display;
      }
    });

    $compile($elem)($rootScope);

    $scope = $elem.scope();
    $scope.$digest();
  }));

  afterEach(function () {
    $scope.$destroy();
  });

  describe('toggleDisplay', function () {
    it('should exist', function () {
      expect($scope.toggleDisplay).to.be.a(Function);
    });

    it('should toggle the display of the field', function () {
      $scope.toggleDisplay($scope.field);
      expect($scope.field.display).to.be(true);
    });

    it('should increase the field popularity', function () {
      $scope.toggleDisplay($scope.field);
      expect($scope.increaseFieldCounter.called).to.be(true);
    });
  });
});
