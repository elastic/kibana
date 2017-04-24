import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';

define(function (require) {
  const module = require('ui/modules').get('app/sheet');
  // bring in the factory
  require('./_saved_sheet.js');


  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  savedObjectManagementRegistry.register({
    service: 'savedSheets',
    title: 'sheets'
  });

  // This is the only thing that gets injected into controllers
  module.service('savedSheets', function (Promise, Private, SavedSheet, kbnUrl) {
    const savedObjectsClient = Private(SavedObjectsClientProvider);
    const savedSheetLoader = new SavedObjectLoader(SavedSheet, savedObjectsClient, kbnUrl, {
      loaderProperties: {
        name: 'timelion-sheet',
        noun: 'Saved Sheets',
        nouns: 'saved sheets'
      },
      getUrl: id => kbnUrl.eval('#/{{id}}', { id: id })
    });
    return savedSheetLoader;
  });
});
