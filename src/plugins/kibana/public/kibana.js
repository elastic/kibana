// autoloading

// preloading (for faster webpack builds)
import moment from 'moment-timezone';
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import modules from 'ui/modules';

import kibanaLogoUrl from 'ui/images/kibana.svg';
import 'ui/autoload/all';
import 'plugins/kibana/discover/index';
import 'plugins/kibana/visualize/index';
import 'plugins/kibana/dashboard/index';
import 'plugins/kibana/settings/index';
import 'plugins/kibana/doc';
import 'ui/vislib';
import 'ui/agg_response';
import 'ui/agg_types';
import 'ui/timepicker';
import 'leaflet';

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
.setTabDefaults({
  resetWhenActive: true,
  lastUrlStore: window.sessionStorage,
  activeIndicatorColor: '#656a76'
})
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
