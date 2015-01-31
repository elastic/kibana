define(function (require) {
  return function IntervalHelperProvider(Private, timefilter, config) {
    var _ = require('lodash');
    var moment = require('moment');

    var datemath = require('utils/datemath');
    var calcAuto = Private(require('components/time_buckets/calc_auto_interval'));
    var calcEsInterval = Private(require('components/time_buckets/calc_es_interval'));
    var tzOffset = moment().format('Z');

    function isValidMoment(m) {
      return m && ('isValid' in m) && m.isValid();
    }

    /**
     * Helper class for wrapping the concept of an "Interval",
     * which describes a timespan that will seperate moments.
     *
     * @param {state} object - one of ""
     * @param {[type]} display [description]
     */
    function TimeBuckets(state) {
      this._setState(state);
    }

    /****
     *  PUBLIC API
     ****/

    /**
     * Set the bounds that these buckets are expected to cover.
     * This is required to support interval "auto" as well
     * as interval scaling.
     *
     * @param {object} input - an object with properties min and max,
     *                       representing the edges for the time span
     *                       we should cover
     *
     * @returns {undefined}
     */
    TimeBuckets.prototype.setBounds = function (input) {
      if (!input) return this.clearBounds();

      var bounds;
      if (_.isPlainObject(input)) {
        // accept the response from timefilter.getActiveBounds()
        bounds = [input.min, input.max];
      } else {
        bounds = _.isArray(input) ? input : [];
      }

      var moments = _(bounds)
        .map(function (time) { return moment(time); })
        .sortBy(Number);

      var valid = moments.size() === 2 && moments.every(isValidMoment);
      if (!valid) {
        this.clearBounds();
        throw new Error('invalid bounds set: ' + input);
      }

      this._state.lb = moments.shift();
      this._state.ub = moments.pop();
      if (this.getDuration().asSeconds() < 0) {
        throw new TypeError('Intervals must be positive');
      }
    };

    /**
     * Clear the stored bounds
     *
     * @return {undefined}
     */
    TimeBuckets.prototype.clearBounds = function () {
      delete this._state.lb;
      delete this._state.ub;
    };

    /**
     * Check to see if we have received bounds yet
     *
     * @return {Boolean}
     */
    TimeBuckets.prototype.hasBounds = function () {
      return isValidMoment(this._state.ub) && isValidMoment(this._state.lb);
    };

    /**
     * Return the current bounds, if we have any.
     *
     * THIS DOES NOT CLONE THE BOUNDS, so editting them
     * may have unexpected side-effects. Always
     * call bounds.min.clone() before editting
     *
     * @return {object|undefined} - If bounds are not defined, this
     *                      returns undefined, else it returns the bounds
     *                      for these buckets. This object has two props,
     *                      min and max. Each property will be a moment()
     *                      object
     *
     */
    TimeBuckets.prototype.getBounds = function () {
      if (!this.hasBounds()) return;
      return {
        min: this._state.lb,
        max: this._state.ub
      };
    };

    /**
     * Get a moment duration object representing
     * the distance between the bounds, if the bounds
     * are set.
     *
     * @return {moment.duration|undefined}
     */
    TimeBuckets.prototype.getDuration = function () {
      if (!this.hasBounds()) return;
      return moment.duration(this._state.ub - this._state.lb, 'ms');
    };

    /**
     * Update the interval at which buckets should be
     * generated.
     *
     * Input can be one of the following:
     *  - Any object from src/kibana/components/agg_types/buckets/_interval_options.js
     *  - "auto"
     *  - Pass a valid moment unit
     *  - a moment.duration object.
     *
     * @param {object|string|moment.duration} input - see desc
     */
    TimeBuckets.prototype.setInterval = function (input) {
      var interval = input;

      // selection object -> val
      if (_.isObject(input)) {
        interval = input.val;
      }

      if (!interval || interval === 'auto') {
        this._state.i = 'auto';
        return;
      }

      if (_.isString(interval)) {
        input = interval;
        interval = moment.duration(1, interval);
        if (+interval === 0) {
          interval = null;
          input += ' (not a valid moment unit)';
        }
      }

      // if the value wasn't converted to a duration, and isn't
      // already a duration, we have a problem
      if (!moment.isDuration(interval)) {
        throw new TypeError('can\'t convert input ' + input + ' to a moment.duration');
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

      // either pull the interval from state or calculate the auto-interval
      function readInterval() {
        var interval = self._state.i;
        if (moment.isDuration(interval)) return interval;
        return calcAuto.near(config.get('histogram:barTarget'), self.getDuration());
      }

      // check to see if the interval should be scaled, and scale it if so
      function maybeScaleInterval(interval) {
        if (!self.hasBounds()) return interval;

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

      // append some TimeBuckets specific props to the interval
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

    /**
     * Get a date format string that will represent dates that
     * progress at our interval.
     *
     * Since our interval can be as small as 1ms, the default
     * date format is usually way too much. with `dateFormat:scaled`
     * users can modify how dates are formatted within series
     * produced by TimeBuckets
     *
     * @return {string}
     */
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

    /**
     * Return a JSON serializable version of the TimeBuckets
     * object. Pass this object back into the TimeBuckets
     * constructor to recreate an object in a nearly identical
     * state.
     *
     * @return {object}
     */
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
      this._state = {};
      if (!state) return;
      this.setBounds([state.lb, state.ub]);
      this.setInterval(state.i);
    };

    return TimeBuckets;
  };
});