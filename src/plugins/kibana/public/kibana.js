// autoloading

// preloading (for faster webpack builds)
import moment from 'moment-timezone';
import chrome from '../../../ui/public/chrome';
import routes from '../../../ui/public/routes';
import modules from '../../../ui/public/modules';

import kibanaLogoUrl from '../../../ui/public/images/kibana.svg';
import '../../../ui/public/autoload/all';
import 'plugins/kibana/discover/index';
import 'plugins/kibana/visualize/index';
import 'plugins/kibana/dashboard/index';
import 'plugins/kibana/settings/index';
import 'plugins/kibana/doc';
import '../../../ui/public/vislib';
import '../../../ui/public/agg_response';
import '../../../ui/public/agg_types';
import '../../../ui/public/timepicker';
import 'leaflet';

routes.enable();

routes
.otherwise({
  redirectTo: `/${chrome.getInjected('kbnDefaultAppId', 'discover')}`
});

chrome
.setTabDefaults({
  resetWhenActive: true,
  lastUrlStore: window.sessionStorage,
  activeIndicatorColor: '#656a76'
})
.setRootController('kibana', function ($scope, courier, config) {
  // wait for the application to finish loading
  $scope.$on('application.load', function () {
    courier.start();
  });

  config.watch('dateFormat:tz', setDefaultTimezone, $scope);

  function setDefaultTimezone(tz) {
    moment.tz.setDefault(tz);
  }
});
