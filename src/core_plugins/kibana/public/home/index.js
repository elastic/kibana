import chrome from 'ui/chrome';
import routes from 'ui/routes';
import template from './home_ng_wrapper.html';
import { uiModules } from 'ui/modules';
import {
  HomeApp
} from './home_app';

const app = uiModules.get('apps/home', []);
app.directive('homeApp', function (reactDirective) {
  return reactDirective(HomeApp);
});

function getRoute() {
  return {
    template,
    controller($scope) {
      $scope.basePath = chrome.getBasePath();
    }
  };
}

// All routing will be handled inside HomeApp via react, we just need to make sure angular doesn't
// redirect us to the default page by encountering a url it isn't marked as being able to handle.
routes.when('/home', getRoute());
routes.when('/home/directory', getRoute());
