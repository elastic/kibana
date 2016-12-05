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
import 'plugins/kibana/dev_tools';
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
.setRootController('kibana', function ($scope, courier, config) {
  // wait for the application to finish loading
  $scope.$on('application.load', function () {
    courier.start();
  });

  config.watch('dateFormat:tz', setDefaultTimezone, $scope);
  config.watch('dateFormat:dow', setStartDayOfWeek, $scope);

  function setDefaultTimezone(tz) {
    moment.tz.setDefault(tz);
  }

  function setStartDayOfWeek(day) {
    const dow = moment.weekdays().indexOf(day);
    moment.updateLocale(moment.locale(), { week: { dow } });
  }
});

modules.get('kibana').run(Notifier.pullMessageFromUrl);

modules.get('kibana').run(function ($rootScope, $location) {
  if (!chrome.getInjected('tribeEnabled')) return;
  const navLink = chrome.getNavLinkById('kibana:dev_tools');
  navLink.disabled = true;
  navLink.tooltip = 'Dev Tools are disabled when using tribe nodes';
  $rootScope.$on('$locationChangeStart', function (event, newUrl) {
    if (~newUrl.indexOf(navLink.url)) $location.path('/').replace();
  });
});
