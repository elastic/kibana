// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
define(function (require) {
  var _ = require('lodash');
  return function () {
    var self = this;
    var scriptFields = {};
    var fielddataFields = [];

    fielddataFields = _.pluck(self.fields.byType['date'], 'name');

    _.each(self.getFields('scripted'), function (field) {
      scriptFields[field.name] = { script: field.script };
    });

    return {
      fields: ['*', '_source'],
      scriptFields: scriptFields,
      fielddataFields: fielddataFields
    };

  };
});