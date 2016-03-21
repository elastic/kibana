import _ from 'lodash';
import 'ui/watch_multi';
import angular from 'angular';
import 'ui/directives/input_focus';
import uiModules from 'ui/modules';
var module = uiModules.get('kibana');


/**
 * kbnTopNavbar directive
 *
 * The top section that shows the timepicker, load, share and save dialogues.
 * ```
 * <kbn-top-navbar config-template="configTemplate"></kbn-top-navbar>
 * ```
 */

module.directive('kbnTopNavbar', function ($compile) {
  return {
    restrict: 'E',
    transclude: true,
    template: `
      <div class="config" ng-show="kbnTopNavbar.currTemplate">
        <div id="template_wrapper" class="container-fluid"></div>
        <div class="config-close remove">
          <i class="fa fa-chevron-circle-up" ng-click="kbnTopNavbar.close()"></i>
        </div>
      </div>`,
    controller: ['$scope', '$compile', function ($scope, $compile) {
      const ctrlObj = this;
      // toggleCurrTemplate(false) to turn it off
      ctrlObj.toggleCurrTemplate = function (which) {
        if (ctrlObj.curr === which || !which) {
          ctrlObj.curr = null;
        } else {
          ctrlObj.curr = which;
        }
        const templateToCompile = ctrlObj.templates[ctrlObj.curr] || false;
        $scope.kbnTopNavbar.currTemplate = templateToCompile ? $compile(templateToCompile)($scope) : false;
      };

      $scope.kbnTopNavbar = {
        currTemplate: false,
        is: which => { return ctrlObj.curr === which; },
        close: () => { ctrlObj.toggleCurrTemplate(false); },
        toggle: ctrlObj.toggleCurrTemplate,
        open: which => {
          if (ctrlObj.curr !== which) {
            ctrlObj.toggleCurrTemplate(which);
          }
        }
      };
    }],
    link: function ($scope, element, attr, configCtrl, transcludeFn) {
      configCtrl.templates = $scope[attr.templates];
      $scope.$watch('kbnTopNavbar.currTemplate', newVal => {
        element.find('#template_wrapper').html(newVal);
      });
    }
  };
});
