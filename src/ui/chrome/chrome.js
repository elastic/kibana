define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var angular = require('angular');
  var modules = require('modules');

  require('ui/timefilter/timefilter');
  require('ui/private');
  require('ui/promises');

  var TabCollection = require('ui/chrome/TabCollection');

  var payload = window.__KBN__;
  window.__KBN__ = null;

  var tabs = new TabCollection();
  var rootController = null;
  var rootTemplate = null;
  var showAppsLink = null;
  var brand = null;

  var chrome = {
    navBackground: '#222222',
    logo: null,
    smallLogo: null
  };

  /**
   * Set the default configuration for tabs.
   *
   * @param {object} defaults - an object that will be applied to all existing and new tabs defined
   */
  chrome.setTabDefaults = function (defaults) {
    tabs.setDefaults(defaults);
    return chrome;
  };

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
   * Set the background for the navbar
   *
   * @param {string} background - css background definition (eg. 'red')
   * @return {chrome}
   * @chainable
   */
  chrome.setNavBackground = function (background) {
    chrome.navBackground = background;
    return chrome;
  };

  /**
   * Set the background for the logo and small logo in the navbar.
   * When the app is in the "small" category, a modified version of the
   * logo is displayed that is 45px wide.
   *
   * @param {string} logo - css background value eg.
   *                      'url(/plugins/app/logo.png) center no-repeat'
   * @param {string|boolean} smallLogo - css background for the small
   *                                   logo, or true to reuse the logos
   * @return {chrome}
   * @chainable
   */
  chrome.setLogo = function (logo, smallLogo) {
    if (smallLogo === true) {
      smallLogo = logo;
    }

    chrome.logo = logo;
    chrome.smallLogo = smallLogo;

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
  chrome.setRootController = function (as, controllerName) {
    if (controllerName === undefined) {
      controllerName = as;
      as = null;
    }

    if (typeof controllerName === 'function') {
      chrome.$$rootControllerConstruct = controllerName;
      controllerName = 'chrome.$$rootControllerConstruct';
    }

    rootController = controllerName + ( as ? ' as ' + as : '' );
    return chrome;
  };

  /**
   * Set the template that should be rendered as the root of the app. If this is set
   * then the application container will no longer be marked as the ng-view and the
   * chrome will take this form:
   *
   *  body
   *    notifs
   *    div.content
   *      nav
   *      config
   *      div.application
   *        <-- your template here -->
   *
   * @param {string} template
   * @return {chrome}
   * @chainable
   */
  chrome.setRootTemplate = function (template) {
    rootTemplate = template;
    return chrome;
  };


  /**
   * Should the link to the app switcher appear in the header?
   *
   * @param  {Bool} val
   * @return {chrome}
   */
  chrome.setShowAppsLink = function (val) {
    showAppsLink = !!val;
    return chrome;
  };

  chrome.setBrand = function (val) {
    brand = val;
    return chrome;
  };

  /**
   * Get the tab list
   * @return {Tab[]} - array of chrome/Tab objects
   */
  chrome.getTabs = function () {
    return tabs.get();
  };

  /**
   * Get the tab for the current url
   * @return {Tab}
   */
  chrome.getActiveTab = function () {
    return tabs.getActive();
  };

  /**
   * Get metadata about the current app, currently that
   * metadata may include: id, title, description, icon, main
   *
   * @return {object}
   */
  chrome.getAppTitle = function () {
    return payload.app.title;
  };

  /**
   * Get the id of the current app. This should match the second path
   * segment of the url.
   *
   * @return {string}
   */
  chrome.getAppId = function () {
    return payload.app.id;
  };

  chrome.getShowAppsLink = function () {
    return showAppsLink == null ? payload.appCount > 1 : showAppsLink;
  };

  chrome.getBrand = function () {
    return brand;
  };

  /**
   * Get the id of the active tab
   *
   * @param {*} def - the default value if there isn't any active tab
   * @return {*}
   */
  chrome.getActiveTabId = function (def) {
    var tab = this.getActiveTab();
    return tab ? tab.id : def;
  };

  chrome.setupAngular = function (moduleDeps) {
    var kibana = modules.get('kibana', moduleDeps);

    kibana
    .constant('kbnVersion', payload.version)
    .constant('buildNum', payload.buildNumber)
    .constant('kbnIndex', payload.kbnIndex)
    .constant('esShardTimeout', payload.esShardTimeout)
    .constant('esUrl', (function () {
      var a = document.createElement('a');
      a.href = '/elasticsearch';
      return a.href;
    }()))
    .constant('commitSha', payload.buildSha)
    .constant('cacheBust', payload.cacheBust)
    .constant('minimumElasticsearchVersion', '2.0.0')
    .constant('sessionId', Date.now());

    modules.link(kibana);
  };

  /**
   * Get the id of the active tab
   *
   * @param {*} def - the default value if there isn't any active tab
   * @return {*}
   */
  chrome.bootstrap = function (angularModules) {
    chrome.setupAngular(angularModules);
    angular.bootstrap(document, ['kibana']);
    $(document.body).children(':not(style-compile)').show();
  };

  // build a kbn-chrome directive that will bind our service to the dom
  require('modules')
  .get('kibana')
  .directive('kbnChrome', function ($rootScope) {
    return {
      compile: function ($el) {
        var $content = $(require('ui/chrome/chrome.html'));
        var $app = $content.find('.application');

        if (rootController) {
          $app.attr('ng-controller', rootController);
        }

        if (rootTemplate) {
          $app.removeAttr('ng-view');
          $app.html(rootTemplate);
        }

        $el.append($content);
      },
      controllerAs: 'chrome',
      controller: function ($scope, $rootScope, $location, $http) {

        // are we showing the embedded version of the chrome?
        chrome.embedded = Boolean($location.search().embed);

        // listen for route changes, propogate to tabs
        onRouteChange();
        $rootScope.$on('$routeChangeSuccess', onRouteChange);
        $rootScope.$on('$routeUpdate', onRouteChange);
        function onRouteChange() {
          var id = $location.path().split('/')[1] || '';
          tabs.trackPathUpdate(id, $location.url(), chrome.embedded);
        }

        // and some local values
        $scope.httpActive = $http.pendingRequests;
        $scope.notifList = require('ui/notify/notify')._notifs;

        return chrome;
      }
    };
  });

  return chrome;
});
