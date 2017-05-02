import routes from 'ui/routes';
import uiChrome from 'ui/chrome';
import template from './getting_started_route.html';
import './components/getting_started';

routes
.when('/management/kibana/getting_started', {
  template: template,
  resolve: {
    navDisplay: () => {
      const isSkipped = true;
      if (isSkipped) {
        uiChrome.setVisible(true);
      }
    }
  },
  controllerAs: 'gettingStartedRoute',
  controller: class GettingStartedRouteController {
    constructor() {
    }
  }
});
