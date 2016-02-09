// autoloading
require('ui/autoload/all');

// preloading (for faster webpack builds)
require('plugins/kibana/discover/index');
require('plugins/kibana/visualize/index');
require('plugins/kibana/dashboard/index');
require('plugins/kibana/settings/index');
require('plugins/kibana/settings/sections');
require('plugins/kibana/doc');
require('ui/vislib');
require('ui/agg_response');
require('ui/agg_types');
require('ui/timepicker');
require('leaflet');

var moment = require('moment-timezone');
var chrome = require('ui/chrome');
var routes = require('ui/routes');
var modules = require('ui/modules');

var kibanaLogoUrl = require('ui/images/kibana.svg');

routes.enable();

routes
.otherwise({
  redirectTo: `/${chrome.getInjected('kbnDefaultAppId', 'discover')}`
});

chrome
.setBrand({
  'logo': 'url(' + kibanaLogoUrl + ') 6px 10px / 140px 50px no-repeat #e8488b',
  'smallLogo': 'url(' + kibanaLogoUrl + ') 6px 10px / 140px 50px no-repeat #e8488b'
})
.setNavBackground('#222222')
.setTabDefaults({
  resetWhenActive: true,
  lastUrlStore: window.sessionStorage,
  activeIndicatorColor: '#656a76'
})
.setTabs([
  {
    id: 'discover',
    title: 'Discover'
  },
  {
    id: 'visualize',
    title: 'Visualize',
    activeIndicatorColor: function () {
      return (String(this.lastUrl).indexOf('/visualize/step/') === 0) ? 'white' : '#656a76';
    }
  },
  {
    id: 'dashboard',
    title: 'Dashboard'
  },
  {
    id: 'settings',
    title: 'Settings'
  }
])
.setRootController('kibana', function ($scope, $rootScope, courier, config) {
  function setDefaultTimezone() {
    moment.tz.setDefault(config.get('dateFormat:tz'));
  }

  // wait for the application to finish loading
  $scope.$on('application.load', function () {
    courier.start();
  });

  $scope.$on('init:config', setDefaultTimezone);
  $scope.$on('change:config.dateFormat:tz', setDefaultTimezone);
});
