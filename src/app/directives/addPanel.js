define([
  'angular',
  'app',
  'lodash'
],
function (angular, app, _) {
  'use strict';

  angular
    .module('kibana.directives')
    .directive('addPanel', function($compile) {
      return {
        restrict: 'A',
        link: function($scope, elem) {

          $scope.$on("$destroy",function() {
            elem.remove();
          });

          $scope.$watch('panel.type', function() {
            var _type = $scope.panel.type;
            $scope.reset_panel(_type);
            if(!_.isUndefined($scope.panel.type)) {
              $scope.panel.loadingEditor = true;
              $scope.require(['panels/'+$scope.panel.type.replace(".","/") +'/module'], function () {
                var template = '<div ng-controller="'+$scope.panel.type+'" ng-include="\'app/partials/paneladd.html\'"></div>';
                elem.html($compile(angular.element(template))($scope));
                $scope.panel.loadingEditor = false;
              });
            }
          });
        }
      };
    });
});