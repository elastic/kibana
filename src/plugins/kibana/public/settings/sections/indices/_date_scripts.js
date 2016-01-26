define(function (require) {
  const _ = require('lodash');

  return function (indexPattern) {
    const dateScripts = {};
    const scripts = {
      __dayOfMonth:   'dayOfMonth',
      __dayOfWeek:    'dayOfWeek',
      __dayOfYear:    'dayOfYear',
      __hourOfDay:    'hourOfDay',
      __minuteOfDay:  'minuteOfDay',
      __minuteOfHour: 'minuteOfHour',
      __monthOfYear:  'monthOfYear',
      __weekOfYear:   'weekOfWeekyear',
      __year:         'year'
    };

    _.each(indexPattern.fields.byType.date, function (field) {
      if (field.indexed) {
        _.each(scripts, function (value, key) {
          dateScripts[field.name + '.' + key] = 'doc["' + field.name + '"].date.' + value;
        });
      }
    });

    return dateScripts;
  };
});
