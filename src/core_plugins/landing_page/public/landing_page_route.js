import routes from 'ui/routes';
import uiChrome from 'ui/chrome';
import template from './landing_page_route.html';
import './components/landing_page';

routes
.when('/management/kibana/landing_page', {
  template: template,
  resolve: {
    navDisplay: () => {
      const isSkipped = true;
      if (isSkipped) {
        uiChrome.setVisible(true);
      }
    }
  },
  controllerAs: 'landingPageRoute',
  controller: class LandingPageRouteController {
    constructor() {
    }
  }
});
