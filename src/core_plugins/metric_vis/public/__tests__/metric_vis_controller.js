import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';

describe('metric vis', function () {
  let $scope;

  const formatter = function (value) {
    return value.toFixed(3);
  };

  const aggConfig = {
    fieldFormatter: () => {
      return formatter;
    },
    schema: {}
  };

  beforeEach(ngMock.module('kibana/metric_vis'));
  beforeEach(ngMock.inject(function ($rootScope, $controller) {
    $scope = $rootScope.$new();
    $scope.renderComplete = () => {};
    $scope.vis = {
      params: {
        metric: {
          colorsRange: [
            { from: 0, to: 1000 }
          ],
          style: {

          }
        }
      }
    };

    const $element = $('<div>');
    $controller('KbnMetricVisController', { $scope, $element });
    $scope.$digest();
  }));

  it('should set the metric label and value', function () {
    $scope.processTableGroups({
      tables: [{
        columns: [{ title: 'Count', aggConfig: { ...aggConfig, makeLabel: () => 'Count' } }],
        rows: [[ 4301021 ]]
      }]
    });

    expect($scope.metrics.length).to.be(1);
    expect($scope.metrics[0].label).to.be('Count');
    expect($scope.metrics[0].value).to.be('4301021.000');
  });

  it('should support multi-value metrics', function () {
    $scope.processTableGroups({
      tables: [{
        columns: [
          { aggConfig: { ...aggConfig, makeLabel: () => '1st percentile of bytes' } },
          { aggConfig: { ...aggConfig, makeLabel: () => '99th percentile of bytes' } }
        ],
        rows: [[ 182, 445842.4634666484 ]]
      }]
    });

    expect($scope.metrics.length).to.be(2);
    expect($scope.metrics[0].label).to.be('1st percentile of bytes');
    expect($scope.metrics[0].value).to.be('182.000');
    expect($scope.metrics[1].label).to.be('99th percentile of bytes');
    expect($scope.metrics[1].value).to.be('445842.463');
  });
});
