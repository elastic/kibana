
import angular from 'ui/angular';
import _ from 'ui/lodash';
import sinon from 'ui/sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import 'ui/private';
import 'plugins/kibana/discover/components/field_chooser/discover_field';
import { StubLogstashIndexPatternProvider } from 'ui/index_patterns/__tests__/stubs';

// Load the kibana app dependencies.

describe('discoverField', function () {
  let $scope;
  let indexPattern;
  let $elem;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $rootScope, $compile) {
    $elem = angular.element(`
      <discover-field
        field="field"
        on-add-field="addField"
        on-remove-field="removeField"
        on-show-details="showDetails"
      ></discover-field>
    `);
    indexPattern = Private(StubLogstashIndexPatternProvider);

    _.assign($rootScope, {
      field: indexPattern.fields.byName.extension,
      addField: sinon.spy(() => $rootScope.field.display = true),
      removeField: sinon.spy(() => $rootScope.field.display = false),
      showDetails: sinon.spy(() => $rootScope.field.details = { exists: true }),
    });

    $compile($elem)($rootScope);

    $scope = $elem.isolateScope();
    $scope.$digest();
    sinon.spy($scope, 'toggleDetails');
  }));

  afterEach(function () {
    $scope.toggleDetails.restore();
    $scope.$destroy();
  });

  describe('toggleDisplay', function () {
    it('should exist', function () {
      expect($scope.toggleDisplay).to.be.a(Function);
    });

    it('should call onAddField or onRemoveField depending on the display state', function () {
      $scope.toggleDisplay($scope.field);
      expect($scope.onAddField.callCount).to.be(1);
      expect($scope.onAddField.firstCall.args).to.eql([$scope.field.name]);

      $scope.toggleDisplay($scope.field);
      expect($scope.onRemoveField.callCount).to.be(1);
      expect($scope.onRemoveField.firstCall.args).to.eql([$scope.field.name]);
    });

    it('should call toggleDetails when currently showing the details', function () {
      $scope.toggleDetails($scope.field);
      $scope.toggleDisplay($scope.field);
      expect($scope.toggleDetails.callCount).to.be(2);
    });
  });

  describe('toggleDetails', function () {
    it('should notify the parent when showing the details', function () {
      $scope.toggleDetails($scope.field);
      expect($scope.onShowDetails.callCount).to.be(1);
    });
  });
});
