define(function (require) {
  return function DateTimeFormatProvider(Private, config, $rootScope) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/index_patterns/_field_format'));
    var moment = require('moment');

    var converter;
    function updateConverter() {
      converter = _.memoize(function converter(val) {
        if (_.isNumber(val) || _.isDate(val)) {
          return moment(val).format(config.get('dateFormat'));
        } else {
          return val;
        }
      });
    }

    // memoize now, once config is ready, and every time the date format changes
    updateConverter();
    $rootScope.$on('init:config', updateConverter);
    $rootScope.$on('change:config.dateFormat', updateConverter);

    _(DateTime).inherits(FieldFormat);
    function DateTime(params) {
      DateTime.Super.call(this, params);
    }

    DateTime.id = 'date';
    DateTime.title = 'Date';
    DateTime.fieldType = 'date';

    DateTime.prototype._convert = function (val) {
      // don't give away our ref to converter so
      // we can hot-swap when config changes
      return converter(val);
    };

    return DateTime;
  };
});
