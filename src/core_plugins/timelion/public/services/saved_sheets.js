import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';
import { uiModules } from 'ui/modules';
import './_saved_sheet.js';

const module = uiModules.get('app/sheet');

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedSheets',
  title: 'sheets'
});

// This is the only thing that gets injected into controllers
module.service('savedSheets', function (Promise, SavedSheet, kbnIndex, kbnUrl, $http, chrome) {
  const savedSheetLoader = new SavedObjectLoader(SavedSheet, kbnIndex, kbnUrl, $http, chrome);
  savedSheetLoader.urlFor = function (id) {
    return kbnUrl.eval('#/{{id}}', { id: id });
  };

  // Customize loader properties since adding an 's' on type doesn't work for type 'timelion-sheet'.
  savedSheetLoader.loaderProperties = {
    name: 'timelion-sheet',
    noun: 'Saved Sheets',
    nouns: 'saved sheets'
  };
  return savedSheetLoader;
});
