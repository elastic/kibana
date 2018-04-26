import './home.less';
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import template from './home_ng_wrapper.html';
import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
import { uiModules } from 'ui/modules';
import {
  HomeApp
} from './components/home_app';
import { recentlyAccessed } from 'ui/persisted_log';

const app = uiModules.get('apps/home', []);
app.directive('homeApp', function (reactDirective) {
  return reactDirective(HomeApp);
});

function getRoute() {
  return {
    template,
    controller($scope, Private) {
      $scope.addBasePath = chrome.addBasePath;
      $scope.directories = Private(FeatureCatalogueRegistryProvider).inTitleOrder;
      $scope.recentlyAccessed = recentlyAccessed.get().map(item => {
        item.link = chrome.addBasePath(item.link);
        return item;
      });
    }
  };
}

// All routing will be handled inside HomeApp via react, we just need to make sure angular doesn't
// redirect us to the default page by encountering a url it isn't marked as being able to handle.
routes.when('/home', getRoute());
routes.when('/home/feature_directory', getRoute());
routes.when('/home/tutorial_directory/:tab?', getRoute());
routes.when('/home/tutorial/:id', getRoute());
