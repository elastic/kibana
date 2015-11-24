define(function (require) {
  var _ = require('lodash');
  require('ui/watch_multi');
  var ConfigTemplate = require('ui/ConfigTemplate');
  var angular = require('angular');
  var module = require('ui/modules').get('kibana');

  require('ui/directives/input_focus');

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

        $scope.$watchMulti([
          'configSubmit',
          'configTemplate.current || configTemplate'
        ], function () {
          var tmpl = $scope.configTemplate;
          if (tmpl instanceof ConfigTemplate) {
            tmpl = tmpl.toString();
          }

          tmpScope.$destroy();
          tmpScope = $scope.$new();

          var html = '';
          if (tmpl) {
            html = $compile('' +
              '<div class="config" ng-show="configTemplate">' +
                wrapTmpl(tmpl) +
              '  <div class="config-close remove" ng-click="close()">' +
              '    <i class="fa fa-chevron-up"></i>' +
              '  </div>' +
              '</div>' +
              ''
            )(tmpScope);
          }

          element.html(html);
        });


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
