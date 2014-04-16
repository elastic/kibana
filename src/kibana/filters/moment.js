define(function (require) {
	var moment = require('moment');

  require('modules')
    .get('kibana/filters')
    .filter('moment', function () {
    return function (datetime) {
      var format = 'MMMM Do YYYY, HH:mm:ss.SSS';
      return moment.isMoment(datetime) ? datetime.format(format) : undefined;
    };
  });
});