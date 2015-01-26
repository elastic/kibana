define(function (require) {
  return function DateFormatProvider(Private, config, $rootScope) {
    var _ = require('lodash');
    var format = Private(require('components/stringify/_format'));
    var moment = require('moment');

    function converter(val) {
      if (_.isNumber(val) || _.isDate(val)) {
        return moment(val).format(config.get('dateFormat'));
      } else {
        return val;
      }
    }

    var memoizedConverter;
    function memoizeDateFormat() {
      memoizedConverter = _.memoize(converter);
    }

    // memoize now, once config is ready, and every time the date format changes
    memoizeDateFormat();
    $rootScope.$on('init:config', memoizeDateFormat);
    $rootScope.$on('change:config.dateFormat', memoizeDateFormat);

    return {
      name: 'date',
      fieldTypes: 'date',
      convert: format(function (val) {
        // don't give away our ref to memoizedConverter so
        // we can hot-swap when config changes
        return memoizedConverter(val);
      })
    };
  };
});