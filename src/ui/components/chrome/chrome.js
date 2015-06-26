define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('components/timefilter/timefilter');
  require('components/private');
  require('components/promises');

  var TabCollection = require('components/chrome/TabCollection');

  var tabs = new TabCollection();
  var rootController = null;
  var rootTemplate = null;
  var payload = null;

  var chrome = {
    navBackground: '#222222',
    logo: null,
    smallLogo: null
  };

  chrome.consumePayload = function (_payload) {
    payload = _payload;
    chrome.setPayload = null;
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
  chrome.setRootController = function (as, construct) {
    if (typeof as === 'function') {
      construct = as;
      as = null;
    }

    rootController = { as: as, construct: construct };
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
   * Get the number of apps available on the server
   * @return {number}
   */
  chrome.getAppCount = function () {
    return payload.appCount;
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

  // build a kbn-chrome directive that will bind our service to the dom
  require('modules')
  .get('kibana')
  .directive('kbnChrome', function ($rootScope) {
    return {
      compile: function ($el) {
        var $content = $(require('text!components/chrome/chrome.html'));
        var $app = $content.find('.application');

        if (rootController) {
          chrome.$$rootControllerConstruct = rootController.construct;
          var ngController = 'chrome.$$rootControllerConstruct';
          if (rootController.as) {
            ngController += ' as ' + rootController.as;
          }

          $app.attr('ng-controller', ngController);
        }

        if (rootTemplate) {
          $app.removeAttr('ng-view');
          $app.html(rootTemplate);
        }

        $el.html($content);
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
          tabs.trackPathUpdate($location.path(), chrome.embedded);
        }

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
