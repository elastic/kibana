define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var TabCollection = require('components/chrome/TabCollection');
  var ConfigTemplate = require('utils/config_template');

  var chrome = {};
  var tabs = new TabCollection();
  var backgroundColor = '#656A76';
  var rootController = null;

  /**
   * Set what tabs should be shown in the header.
   *
   * @param {TabSpec[]} tabSpecs - array of objects describing the
   *                             tabs to create. See chrome/Tab for
   *                             more info
   * @return {chrome}
   * @chainable
   */
  chrome.setTabs = function (tabSpecs) {
    tabs.set(tabSpecs);
    return chrome;
  };

  /**
   * Get the tab list
   *
   * @return {Tab[]} - array of chrome/Tab objects
   */
  chrome.getTabs = function () {
    return tabs.get();
  };

  /**
   * Get the tab for the current url
   *
   * @return {Tab}
   */
  chrome.getActiveTab = function () {
    return tabs.getActive();
  };

  /**
   * Set the background color for the header
   *
   * @param {string} color - css color definition (eg. 'red', 'rgb(68, 68, 68)', or '#ffffff')
   * @return {chrome}
   * @chainable
   */
  chrome.setBackgroundColor = function (color) {
    backgroundColor = color;
    return chrome;
  };

  /**
   * Set a controller that will be bound to the root of the application, outside of the
   * ng-view, and will persist across routes
   *
   * @param {String} as - the name that the controller should bind to
   * @param {Function} controller - the controller initializer function
   * @return {chrome}
   * @chainable
   */
  chrome.setRootController = function (as, construct) {
    rootController = { as: as, construct: construct };
    return chrome;
  };

  // build a kbn-chrome directive that will bind our service to the dom
  require('modules')
  .get('kibana')
  .directive('kbnChrome', function () {
    return {
      compile: function ($el) {
        var $content = $(require('text!components/chrome/chrome.html'));
        if (rootController) {
          chrome.$$rootControllerConstruct = rootController.construct;
          var ngController = 'chrome.$$rootControllerConstruct';
          if (rootController.as) {
            ngController += ' as ' + rootController.as;
          }

          $content
          .find('.application')
          .attr('ng-controller', ngController);
        }

        $el.html($content);
      },
      controllerAs: 'chrome',
      controller: function ($scope, $rootScope, $location, timefilter, globalState, $http) {

        // are we showing the embedded version of the chrome?
        chrome.embedded = Boolean($location.search().embed);

        // listen for route changes, propogate to tabs
        var onRouteChange = _.bindKey(tabs, 'trackPathUpdate');
        $rootScope.$on('$routeChangeSuccess', onRouteChange);
        $rootScope.$on('$routeUpdate', onRouteChange);

        // chrome is responsible for timepicker ui and state transfer...
        $scope.timefilter = timefilter;
        $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
          globalState.time = _.clone(timefilter.time);
          globalState.refreshInterval = _.clone(timefilter.refreshInterval);
          globalState.save();
        });

        $scope.pickerTemplate = new ConfigTemplate({
          filter: require('text!components/chrome/config/filter.html'),
          interval: require('text!components/chrome/config/interval.html')
        });

        $scope.toggleRefresh = function () {
          timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
        };

        // and some local values
        $scope.httpActive = $http.pendingRequests;
        $scope.notifList = require('components/notify/notify')._notifs;

        return chrome;
      }
    };
  })
  .directive('kbnChromeTimepicker', function () {

  });

  return chrome;
});
