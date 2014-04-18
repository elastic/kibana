define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  var datemath = require('utils/datemath');
  var module = require('modules').get('kibana/services');

  module.service('timefilter', function () {
    
    var self = this;

    // TODO: This should be disabled on route change, apps need to enable it explicitly
    var enable = false;
    
    // These can be date math strings or moments.
    this.time = {
      from: 'now-15m',
      to: 'now'
    };

    this.enabled = function (state) {
      if (!_.isUndefined(state)) enable = state;
      return enable;
    };

    this.get = function (indexPattern) {
      var timefield, filter;
      
      // TODO: time field should be stored in the pattern meta data. For now we just use the first date field we find
      timefield = _.findKey(indexPattern, {type: 'date'});
      if (!!timefield) {
        filter = {range : {}};
        filter.range[timefield] = {
          gte: datemath.parse(self.time.from).valueOf(),
          lte: datemath.parse(self.time.to, true).valueOf()
        };
      }
      return filter;
    };

  });

});