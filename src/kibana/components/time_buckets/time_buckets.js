define(function (require) {
  return function IntervalHelperProvider(Private, timefilter, config) {
    var _ = require('lodash');
    var moment = require('moment');

    var datemath = require('utils/datemath');
    var calcAuto = Private(require('components/time_buckets/calc_auto_interval'));
    var calcEsInterval = Private(require('components/time_buckets/calc_es_interval'));
    var tzOffset = moment().format('Z');

    /**
     * Helper class for wrapping the concept of an "Interval",
     * which describes a timespan that will seperate moments.
     *
     * @param {state} object - one of ""
     * @param {[type]} display [description]
     */
    function TimeBuckets(state) {
      this._state = _.pick(state || {}, 'i', 'lb', 'ub');
    }


    /****
     *  PUBLIC API
     ****/

    TimeBuckets.prototype.setBounds = function (bounds) {
      if (!_.isArray(bounds)) {
        bounds = [bounds.min, bounds.max];
      }

      bounds = _.compact(bounds).map(function (time) {
        return moment(time);
      });

      if (bounds.length !== 2) return;

      this._state.lb = bounds[0];
      this._state.ub = bounds[1];

      if (this.getDuration().asSeconds() < 0) {
        throw new TypeError('Intervals must be positive');
      }
    };


    TimeBuckets.prototype.getBounds = function () {
      return {
        min: this._state.lb,
        max: this._state.ub
      };
    };


    TimeBuckets.prototype.getDuration = function () {
      return moment.duration(this._state.ub - this._state.lb, 'ms');
    };

    TimeBuckets.prototype.setInterval = function (interval) {
      // selection object -> val
      if (_.isObject(interval)) {
        interval = interval.val;
      }

      // check for no val or 'auto'
      if (!interval || interval === 'auto') {
        this._state.i = 'auto';
        return;
      }

      // convert "second", "hour" to durations
      if (_.isString(interval)) {
        interval = moment.duration(1, interval);
      }

      // if the value wasn't converted to a duration, and isn't
      // already a duration, we have a problem
      if (!moment.isDuration(interval)) {
        throw new TypeError('can\'t convert interval ' + interval + ' to moment.duration');
      }

      this._state.i = interval;
    };

    /**
     * Get the interval for the buckets. If the
     * number of buckets created by the interval set
     * is larger than config:histogram:maxBars then the
     * interval will be scaled up. If the number of buckets
     * created is less than one, the interval is scaled back.
     *
     * The interval object returned is a moment.duration
     * object that has been decorated with the following
     * properties.
     *
     * interval.description: a text description of the interval.
     *   designed to be used list "field per {{ desc }}".
     *     - "minute"
     *     - "10 days"
     *     - "3 years"
     *
     * interval.expr: the elasticsearch expression that creates this
     *   interval. If the interval does not properly form an elasticsearch
     *   expression it will be forced into one.
     *
     * interval.scaled: the interval was adjusted to
     *   accomidate the maxBars setting.
     *
     * interval.scale: the numer that y-values should be
     *   multiplied by
     *
     * interval.scaleDescription: a description that reflects
     *   the values which will be produced by using the
     *   interval.scale.
     *
     *
     * @return {[type]} [description]
     */
    TimeBuckets.prototype.getInterval = function () {
      var self = this;
      return decorateInterval(maybeScaleInterval(readInterval()));

      function readInterval() {
        var interval = self._state.i;

        if (moment.isDuration(interval)) {
          return interval;
        }

        return calcAuto.near(config.get('histogram:barTarget'), self.getDuration());
      }

      function maybeScaleInterval(interval) {
        var duration = self.getDuration();
        var maxLength = config.get('histogram:maxBars');

        var approxLen = duration / interval;
        var scaled;

        if (approxLen < 1) {
          scaled = calcAuto.atLeast(1, duration);
        } else if (approxLen > maxLength) {
          scaled = calcAuto.lessThan(maxLength, duration);
        } else {
          return interval;
        }

        if (+scaled === +interval) return interval;

        decorateInterval(interval);
        return _.assign(scaled, {
          preScaled: interval,
          scale: interval / scaled,
          scaled: true
        });
      }

      function decorateInterval(interval) {
        var esInterval = calcEsInterval(interval);
        interval.esValue = esInterval.value;
        interval.esUnit = esInterval.unit;
        interval.expression = esInterval.expression;

        var prettyUnits = moment.normalizeUnits(esInterval.unit);
        if (esInterval.value === 1) {
          interval.description = prettyUnits;
        } else {
          interval.description = esInterval.value + ' ' + prettyUnits + 's';
        }

        return interval;
      }
    };

    TimeBuckets.prototype.getScaledDateFormat = function () {
      var interval = this.getInterval();
      var rules = config.get('dateFormat:scaled');

      for (var i = rules.length - 1; i >= 0; i --) {
        var rule = rules[i];
        if (!rule[0] || interval >= moment.duration(rule[0])) {
          return rule[1];
        }
      }
    };

    TimeBuckets.prototype.toJSON = function () {
      return this._toState();
    };


    /***
     *  PRIVATE API
     ***/
    TimeBuckets.prototype._toState = function () {
      return JSON.parse(JSON.stringify(this._state));
    };

    TimeBuckets.prototype._setState = function (state) {
      this.setInterval(state.i);
      this.setBounds(state.b);
    };

    return TimeBuckets;
  };
});