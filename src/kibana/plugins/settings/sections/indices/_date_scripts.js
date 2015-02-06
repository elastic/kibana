define(function (require) {
  var _ = require('lodash');

  return function (indexPattern) {
    var dateScripts = {};
    var scripts = [
      'dayOfMonth',
      'dayOfWeek',
      'dayOfYear',
      'hourOfDay',
      'minuteOfDay',
      'minuteOfHour',
      'monthOfYear',
      'weekOfWeekyear',
      'weekyear',
      'year'
    ];

    _.each(indexPattern.fields.byType['date'], function (field) {
      if (field.indexed) {
        scripts.forEach(function (script) {
          dateScripts[field.name + '.__' + script] = 'doc["' + field.name + '"].date.' + script;
        });
      }
    });

    return dateScripts;
  };
});