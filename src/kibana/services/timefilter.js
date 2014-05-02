define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  var datemath = require('utils/datemath');
  var module = require('modules').get('kibana/services');

  module.service('timefilter', function (Promise, globalState) {

    var self = this;

    // TODO: This should be disabled on route change, apps need to enable it explicitly
    var enable = false;

    // These can be date math strings or moments.
    this.time = _.defaults(globalState.time || {}, {
      from: 'now-15m',
      to: 'now'
    });

    globalState.onUpdate(function readFromGlobalState() {
      _.assign(self.time, globalState.time);
    });

    this.enabled = function (state) {
      if (!_.isUndefined(state)) enable = state;
      return enable;
    };

    this.get = function (indexPattern) {
      var timefield, filter;
      
      // TODO: time field should be stored in the pattern meta data. For now we just use the first date field we find
      timefield = _.find(indexPattern.fields, {type: 'date'});
      var bounds = this.getBounds();

      if (!!timefield) {
        filter = {range : {}};
        filter.range[timefield.name] = {
          gte: bounds.min,
          lte: bounds.max
        };
      }
      return filter;
    };

    this.getBounds = function (timefield) {
      return {
        min: datemath.parse(self.time.from).valueOf(),
        max: datemath.parse(self.time.to, true).valueOf()
      };
    };

  });

});