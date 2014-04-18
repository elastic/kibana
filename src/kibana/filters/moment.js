define(function (require) {
	var moment = require('moment');
  var _ = require('lodash');

  require('modules')
    .get('kibana/filters')
    .filter('moment', function () {
    return function (datetime, roundUp) {
      var format = 'MMMM Do YYYY, HH:mm:ss.SSS';
      if (moment.isMoment(datetime)) return datetime.format(format);
      if (_.isDate(datetime)) return moment(datetime).format(format);
      return datetime;
    };
  });
});