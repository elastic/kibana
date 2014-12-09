define(function (require) {
  var _ = require('lodash');

  return function (indexPattern) {


    function getScript(field, format) {
      return 'Integer.parseInt(new Date(doc["' + field + '"].value).format("' + format + '"))';
    }

    var dateScripts = {};
    var scripts = {
      __minuteOfHour: 'm',
      __hourOfDay:    'H',
      __dayOfWeek:    'u',
      __dayOfMonth:   'd',
      __dayOfYear:    'D',
      __weekOfMonth:  'W',
      __weekOfYear:   'w',
      __monthOfYear:  'M'
    };

    _.each(indexPattern.fields.byType['date'], function (field) {
      if (field.indexed) {
        _.each(scripts, function (format, scriptKey) {
          dateScripts[field.name + '.' + scriptKey] = getScript(field.name, format);
        });
      }
    });

    return dateScripts;
  };
});