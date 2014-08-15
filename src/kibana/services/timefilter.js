define(function (require) {
  require('modules')
  .get('kibana')
  .service('timefilter', function (Private, globalState, $rootScope) {

    var _ = require('lodash');
    var angular = require('angular');
    var moment = require('moment');
    var datemath = require('utils/datemath');
    var Events = Private(require('factories/events'));
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

      // These can be date math strings or moments.
      self.time = _.defaults(globalState.time || {}, {
        from: 'now-15m',
        to: 'now'
      });

      globalState.on('fetch_with_changes', function () {
        _.assign(self.time, globalState.time);

        var time = globalState.time;
        if (time && time.from) this.time.from = convertISO8601(time.from);
        if (time && time.to) this.time.to = convertISO8601(time.to);
      });

      $rootScope.$$timefilter = self;
      $rootScope.$watch('$$timefilter.time', function (newTime, oldTime) {
        // don't fetch unless there was a previous value and the values are not loosly equal
        if (!_.isUndefined(oldTime) && !angular.equals(newTime, oldTime)) self.emit('update');
      }, true);
    }

    Timefilter.prototype.enabled = function (state) {
      this.enabled = !!state;
    };

    Timefilter.prototype.get = function (indexPattern) {
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

    Timefilter.prototype.getBounds = function (timefield) {
      return {
        min: datemath.parse(this.time.from),
        max: datemath.parse(this.time.to, true)
      };
    };

    return new Timefilter();
  });

});
