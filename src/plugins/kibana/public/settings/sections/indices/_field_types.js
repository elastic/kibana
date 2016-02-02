define(function (require) {
  return function GetFieldTypes() {
    const _ = require('lodash');

    return function (indexPattern) {
      const fieldCount = _.countBy(indexPattern.fields, function (field) {
        return (field.scripted) ? 'scripted' : 'indexed';
      });

      _.defaults(fieldCount, {
        indexed: 0,
        scripted: 0
      });

      return [{
        title: 'fields',
        index: 'indexedFields',
        count: fieldCount.indexed
      }, {
        title: 'scripted fields',
        index: 'scriptedFields',
        count: fieldCount.scripted
      }];
    };
  };
});
