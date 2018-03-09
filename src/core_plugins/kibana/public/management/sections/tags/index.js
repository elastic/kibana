import uiRoutes from 'ui/routes';
import tagListingTemplate from './tag_listing_ng_wrapper.html';
import { management } from 'ui/management';
import { uiModules } from 'ui/modules';
import {
  SavedObjectsClientProvider,
  TagsClient,
} from 'ui/saved_objects';
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
    controller($scope, Private) {
      const savedObjectsClient = Private(SavedObjectsClientProvider);
      const tagsClient = new TagsClient(savedObjectsClient);

      $scope.save = (attributes, id, version) => {
        return tagsClient.save(attributes, id, version);
      };
      $scope.delete = (ids) => {
        return tagsClient.delete(ids);
      };
      $scope.find = (search) => {
        return tagsClient.find(search, 10000);
      };
    },
  });

management.getSection('kibana').register('tags', {
  display: 'Tags',
  order: 1,
  url: '#/management/kibana/tags/'
});
