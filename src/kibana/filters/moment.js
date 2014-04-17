define(function (require) {
	var moment = require('moment');
  var _ = require('lodash');
  var datemath = require('utils/datemath');

  require('modules')
    .get('kibana/filters')
    .filter('moment', function () {
    return function (datetime, roundUp) {
      var format = 'MMMM Do YYYY, HH:mm:ss.SSS';
      var parsed = datemath.parse(datetime, roundUp);
      if (parsed) return parsed.format(format);
      return undefined;
    };
  });
});