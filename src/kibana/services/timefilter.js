define(function (require) {
  require('modules')
  .get('kibana')
  .service('timefilter', function (Private, globalState, $rootScope) {

    var _ = require('lodash');
    var angular = require('angular');
    var moment = require('moment');
    var datemath = require('utils/datemath');
    var Events = Private(require('factories/events'));
    var diff = Private(require('utils/diff_time_picker_vals'));

    require('components/state_management/global_state');

    function convertISO8601(stringTime) {
      var obj = moment(stringTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
      return obj.isValid() ? obj : stringTime;
    }

    _(Timefilter).inherits(Events);
    function Timefilter() {
      Timefilter.Super.call(this);

      var self = this;

      self.enabled = false;

      var timeDefaults = {
        from: 'now-15m',
        to: 'now'
      };

      // These can be date math strings or moments.
      self.time = _.defaults(globalState.time || {}, timeDefaults);

      globalState.on('fetch_with_changes', function () {
        // clone and default to {} in one
        var newTime = _.defaults({}, globalState.time, timeDefaults);

        if (newTime) {
          if (newTime.to) newTime.to = convertISO8601(newTime.to);
          if (newTime.from) newTime.from = convertISO8601(newTime.from);
        }

        self.time = newTime;
      });

      $rootScope.$$timefilter = self;
      $rootScope.$watchMulti([
        '$$timefilter.time.from',
        '$$timefilter.time.to',
        '$$timefilter.time.mode',
        '$$timefilter.time'
      ], (function () {
        var oldTime;

        return function () {
          if (diff(self.time, oldTime)) {
            self.emit('update');
          }

          oldTime = _.clone(self.time);
        };
      }()));
    }

    Timefilter.prototype.get = function (indexPattern) {
      var filter;
      var timefield = indexPattern.timeFieldName && _.find(indexPattern.fields, {name: indexPattern.timeFieldName});

      if (timefield) {
        var bounds = this.getBounds();
        filter = {range : {}};
        filter.range[timefield.name] = {
          gte: bounds.min.valueOf(),
          lte: bounds.max.valueOf()
        };
      }
      return filter;
    };

    Timefilter.prototype.getBounds = function (timefield) {
      return {
        min: datemath.parse(this.time.from),
        max: datemath.parse(this.time.to, true)
      };
    };

    return new Timefilter();
  });

});
