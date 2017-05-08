import 'plugins/kibana/discover/saved_searches/_saved_search';
import 'ui/notify';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
const module = uiModules.get('discover/saved_searches', [
  'kibana/notify'
]);

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedSearches',
  title: 'searches'
});

module.service('savedSearches', function (Promise, Private, config, createNotifier, SavedSearch, kbnUrl) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);
  return new SavedObjectLoader(SavedSearch, savedObjectsClient, kbnUrl, {
    loaderProperties: {
      name: 'searches',
      noun: 'Saved Search',
      nouns: 'saved searches'
    },
    getUrl: id => kbnUrl.eval('#/discover/{{id}}', { id: id })
  });
});
