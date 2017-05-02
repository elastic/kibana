import { uiModules } from 'ui/modules';
import template from './landing_page.html';

const app = uiModules.get('kibana');

app.directive('landingPage', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
    },
    bindToController: true,
    controllerAs: 'landingPage',
    controller: class LandingPageController {
      constructor() {
      }
    }
  };
});
