
import angular from 'angular';
import _ from 'lodash';
import sinon from 'auto-release-sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';
import 'ui/private';
import 'plugins/kibana/discover/components/field_chooser/discover_field';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

// Load the kibana app dependencies.

describe('discoverField', function () {
  let $scope;
  let indexPattern;
  let $elem;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $rootScope, $compile) {
    $elem = angular.element('<discover-field></discover-field>');
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

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
