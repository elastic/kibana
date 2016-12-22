import routes from 'ui/routes';
import modules from 'ui/modules';
import visualizeLandingTemplate from './visualize_landing.html';
import { VisualizeLandingController } from './visualize_landing';

routes
.when('/visualize/landing', {
  template: visualizeLandingTemplate,
  controller: VisualizeLandingController,
  controllerAs: 'landingController',
});
