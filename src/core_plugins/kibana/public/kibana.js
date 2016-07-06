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
import 'plugins/kibana/management/index';
import 'plugins/kibana/doc';
import 'ui/vislib';
import 'ui/agg_response';
import 'ui/agg_types';
import 'ui/timepicker';
import Notifier from 'ui/notify/notifier';
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

function showNotifier($location) {
  const queryString = $location.search();
  if (queryString.notif_msg) {
    const message = queryString.notif_msg;
    const config = queryString.notif_loc ? { location: queryString.notif_loc } : {};
    const level = queryString.notif_lvl || 'info';

    $location.search('notif_msg', null);
    $location.search('notif_loc', null);
    $location.search('notif_lvl', null);

    const notifier = new Notifier(config);
    notifier[level](message);
  }
}

modules.get('kibana').run(showNotifier);
