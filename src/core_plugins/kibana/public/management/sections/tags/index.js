import uiRoutes from 'ui/routes';
import tagListingTemplate from './tag_listing_ng_wrapper.html';
import { management } from 'ui/management';
import { uiModules } from 'ui/modules';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import {
  TagListing
} from './components/tag_listing';

const app = uiModules.get('apps/management', []);
app.directive('kbnManagementTags', function (reactDirective) {
  return reactDirective(TagListing);
});

uiRoutes
  .when('/management/kibana/tags', {
    template: tagListingTemplate,
    controller($scope, Private, config) {
      const savedObjectsClient = Private(SavedObjectsClientProvider);

      $scope.find = () => {

      }

      $scope.delete = () => {

      }
    },
  });

management.getSection('kibana').register('tags', {
  display: 'Tags',
  order: 30,
  url: '#/management/kibana/tags/'
});
