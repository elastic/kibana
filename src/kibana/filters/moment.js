define(function (require) {
	var moment = require('moment');
  var _ = require('lodash');

  require('modules')
    .get('kibana')
    .filter('moment', function (config) {
    return function (datetime) {
      var format = config.get('dateFormat');
      if (moment.isMoment(datetime)) return datetime.format(format);
      if (_.isDate(datetime)) return moment(datetime).format(format);
      return datetime;
    };
  });
});