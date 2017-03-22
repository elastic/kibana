import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';

define(function (require) {
  const module = require('ui/modules').get('app/sheet');
  // bring in the factory
  require('./_saved_sheet.js');


  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/management/saved_object_registry').register({
    service: 'savedSheets',
    title: 'sheets'
  });

  // This is the only thing that gets injected into controllers
  module.service('savedSheets', function (Promise, SavedSheet, kbnIndex, esAdmin, kbnUrl) {
    const savedSheetLoader = new SavedObjectLoader(SavedSheet, kbnIndex, esAdmin, kbnUrl);
    savedSheetLoader.urlFor = function (id) {
      return kbnUrl.eval('#/{{id}}', { id: id });
    };
    savedSheetLoader.loaderProperties = {
      name: 'timelion-sheet',
      noun: 'Saved Sheets',
      nouns: 'saved sheets'
    };
    return savedSheetLoader;
  });
});
