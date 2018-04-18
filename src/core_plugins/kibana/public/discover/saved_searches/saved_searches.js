import './_saved_search';
import 'ui/notify';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import { savedObjectManagementRegistry } from '../../management/saved_object_registry';
const module = uiModules.get('discover/saved_searches', [
  'kibana/notify'
]);

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedSearches',
  title: 'searches'
});

module.service('savedSearches', function (Promise, config, kbnIndex, createNotifier, SavedSearch, kbnUrl, $http, chrome) {
  const savedSearchLoader = new SavedObjectLoader(SavedSearch, kbnIndex, kbnUrl, $http, chrome);
  // Customize loader properties since adding an 's' on type doesn't work for type 'search' .
  savedSearchLoader.loaderProperties = {
    name: 'searches',
    noun: 'Saved Search',
    nouns: 'saved searches'
  };

  savedSearchLoader.urlFor = function (id) {
    return kbnUrl.eval('#/discover/{{id}}', { id: id });
  };

  return savedSearchLoader;
});
