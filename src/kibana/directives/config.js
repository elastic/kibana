define(function (require) {
  var _ = require('lodash');
  var ConfigTemplate = require('utils/config_template');
  var angular = require('angular');
  var module = require('modules').get('kibana');

  require('directives/input_focus');

  /**
   * config directive
   *
   * Creates a full width horizonal config section, usually under a nav/subnav.
   * ```
   * <config config-template="configTemplate" config-object="configurable"></config>
   * ```
   */

  module.directive('config', function ($compile) {
    return {
      restrict: 'E',
      scope: {
        configTemplate: '=',
        configClose: '=',
        configSubmit: '=',
        configObject: '='
      },
      link: function ($scope, element, attr) {
        var tmpScope = $scope.$new();

        $scope.$watch('configObject', function (newVal) {
          $scope[attr.configObject] = $scope.configObject;
        });

        var wrapTmpl = function (tmpl) {
          if ($scope.configSubmit) {
            return '<form role="form" class="container-fluid" ng-submit="configSubmit()">' + tmpl + '</form>';
          } else {
            return '<div class="container-fluid">' + tmpl + '</div>';
          }
        };

        var render = function (newTemplate, oldTemplate) {
          var tmpl = $scope.configTemplate;
          if (tmpl instanceof ConfigTemplate) {
            tmpl = tmpl.toString();
          }

          tmpScope.$destroy();
          tmpScope = $scope.$new();

          element.html(!tmpl ? '' : $compile('' +
            '<div class="config" ng-show="configTemplate">' +
              wrapTmpl(tmpl) +
            '  <div class="config-close remove" ng-click="close()">' +
            '    <i class="fa fa-chevron-up"></i>' +
            '  </div>' +
            '</div>' +
            ''
          )(tmpScope));
        };

        $scope.$watch('configSubmit', render);
        $scope.$watch('configTemplate.current || configTemplate', render);


        $scope.close = function () {
          if (_.isFunction($scope.configClose)) $scope.configClose();
          if ($scope.configTemplate instanceof ConfigTemplate) {
            $scope.configTemplate.current = null;
          } else {
            $scope.configTemplate = null;
          }
        };
      }
    };
  });
});