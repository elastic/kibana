import _ from 'lodash';
import 'ui/watch_multi';
import angular from 'angular';
import 'ui/directives/input_focus';
import uiModules from 'ui/modules';
var module = uiModules.get('kibana');


/**
 * kbnTopNav directive
 *
 * The top section that shows the timepicker, load, share and save dialogues.
 * ```
 * <kbn-top-nav name="current-app-for-extensions" config="path.to.menuItems"></kbn-top-nav>
 * ```
 */

module.directive('kbnTopNav', function (Private) {
  const filterTemplate = require('ui/chrome/config/filter.html');
  const intervalTemplate = require('ui/chrome/config/interval.html')
  function optionsNormalizer(defaultFunction, opt) {
    if (!opt.key) {
      return false;
    }
    return _.assign({
      label: _.capitalize(opt.key),
      hasFunction: !!opt.run,
      description: ('Toggle ' + opt.key),
      run: defaultFunction
    }, opt);
  }
  function getTemplatesMap(configs) {
    const templateMap = {};
    configs.forEach(conf => {
      if (conf.template) {
        templateMap[conf.key] = conf.template;
      }
    });
    return templateMap;
  }
  return {
    restrict: 'E',
    transclude: true,
    scope: true,
    template: function ($el, $attrs) {
      // This is ugly
      // This is necessary because of navbar-extensions
      // It will no accept any programatic way of setting its name
      // besides this because it happens so early in the digest cycle
      return `
      <navbar class="kibana-nav-options">
        <div ng-transclude></div>
        <div class="button-group kibana-nav-actions" role="toolbar">
          <button
            ng-repeat="menuItem in kbnTopNav.menuItems"
            area-label="menuItem.description"
            aria-haspopup="menuItem.hasFunction"
            aria-expanded="kbnTopNav.is(menuItem.key)"
            ng-class="{active: kbnTopNav.is(menuItem.key)}"
            ng-click="menuItem.run(menuItem)"
            ng-bind="menuItem.label">
          </button>
          <navbar-extensions name="${$attrs.name}"></navbar-extensions>
        </div>
      <div class="chrome-actions" kbn-chrome-append-nav-controls></div>
      </navbar>
      <div class="config" ng-show="kbnTopNav.currTemplate">
        <div id="template_wrapper" class="container-fluid"></div>
        <div class="config-close remove">
          <i class="fa fa-chevron-circle-up" ng-click="kbnTopNav.close()"></i>
        </div>
      </div>`;
    },
    controller: ['$scope', '$compile', '$attrs', function ($scope, $compile, $attrs) {
      const ctrlObj = this;
      // toggleCurrTemplate(false) to turn it off
      ctrlObj.toggleCurrTemplate = function (which) {
        if (ctrlObj.curr === which || !which) {
          ctrlObj.curr = null;
        } else {
          ctrlObj.curr = which;
        }
        const templateToCompile = ctrlObj.templates[ctrlObj.curr] || false;
        $scope.kbnTopNav.currTemplate = templateToCompile ? $compile(templateToCompile)($scope) : false;
      };
      const normalizeOpts = _.partial(optionsNormalizer, (item) => {
        ctrlObj.toggleCurrTemplate(item.key);
      });

      const niceMenuItems = _.compact($scope[$attrs.config].map(normalizeOpts));
      ctrlObj.templates = _.assign({
        interval: intervalTemplate,
        filter: filterTemplate,
      }, getTemplatesMap(niceMenuItems));


      $scope.kbnTopNav = {
        menuItems: niceMenuItems,
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
    link: function ($scope, element, attr, configCtrl) {
      $scope.$watch('kbnTopNav.currTemplate', newVal => {
        element.find('#template_wrapper').html(newVal);
      });
    }
  };
});
