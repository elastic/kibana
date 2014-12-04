// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  var _ = require('lodash');
  return function () {
    var self = this;
    var scriptFields = {};

    _.each(self.fields.byType['date'], function (field) {
      if (field.indexed) {
        scriptFields[field.name] = {
          script: 'doc["' + field.name + '"].value'
        };
      }
    });
    return {
      fields: ['*', '_source'],
      scriptFields: scriptFields
    };

  };
});
