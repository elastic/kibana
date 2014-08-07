define(function (require) {
  var _ = require('lodash');
  var moment = require('moment');
  var datemath = require('utils/datemath');
  var module = require('modules').get('kibana');
  require('components/state_management/global_state');

  module.service('timefilter', function (Promise, globalState, $rootScope) {

    var self = this;

    // TODO: This should be disabled on route change, apps need to enable it explicitly
    var enable = false;

    // These can be date math strings or moments.
    $rootScope.time = this.time = _.defaults(globalState.time || {}, {
      from: 'now-15m',
      to: 'now'
    });

    // Only gets called if the user manually updates the URL
    globalState.onUpdate(function readFromGlobalState() {
      _.assign(self.time, globalState.time);
      castTime();
    });

    var init = function () {
      castTime();
    };

    var convertISO8601 = function (stringTime) {
      var obj = moment(stringTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
      return obj.isValid() ? obj : stringTime;
    };

    var castTime = function () {
      var time = globalState.time;
      if (time && time.from) self.time.from = convertISO8601(time.from);
      if (time && time.to) self.time.to = convertISO8601(time.to);
    };

    this.enabled = function (state) {
      if (!_.isUndefined(state)) enable = state;
      return enable;
    };

    this.get = function (indexPattern) {
      var filter;
      var timefield = indexPattern.timeFieldName && _.find(indexPattern.fields, {name: indexPattern.timeFieldName});

      if (timefield) {
        var bounds = this.getBounds();
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
        min: datemath.parse(self.time.from),
        max: datemath.parse(self.time.to, true)
      };
    };

    init();

  });

});
