import uiRoutes from 'ui/routes';
import landingTemplate from 'plugins/kibana/management/landing.html';

uiRoutes
  .when('/management', {
    template: landingTemplate
  });
