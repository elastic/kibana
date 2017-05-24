import routes from 'ui/routes';
import template from './getting_started_route.html';
import './components/getting_started';
import { GETTING_STARTED_ROUTE } from './lib/constants';

routes
.when(GETTING_STARTED_ROUTE, {
  template: template,
  controllerAs: 'gettingStartedRoute',
  controller: class GettingStartedRouteController {
    constructor() {
    }
  }
});
