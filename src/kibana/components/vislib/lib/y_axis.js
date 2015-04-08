define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');
    var numeral = require('numeral');
    var errors = require('errors');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));

    /**
     * Appends y axis to the visualization
     *
     * @class YAxis
     * @constructor
     * @param args {{el: (HTMLElement), yMax: (Number), _attr: (Object|*)}}
     */
    function YAxis(args) {
      this.el = args.el;
      this.scale = null;
      this.domain = [args.yMin, args.yMax];
      this._attr = args._attr || {};
    }

    _(YAxis.prototype).extend(ErrorHandler.prototype);

    /**
     * Renders the y axis
     *
     * @method render
     * @return {D3.UpdateSelection} Renders y axis to visualization
     */
    YAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.y-axis-div').call(this.draw());
    };

    YAxis.prototype._isPercentage = function () {
      return (this._attr.mode === 'percentage');
    };

    YAxis.prototype._isUserDefined = function () {
      return (this._attr.setYExtents.min || this._attr.setYExtents.max);
    };

    YAxis.prototype._isYExtents = function () {
      return (this._attr.defaultYExtents);
    };

    YAxis.prototype._validateUserExtents = function (domain) {
      var self = this;
      var extents = ['min', 'max'];

      return domain.map(function (val, i) {
        var extent = extents[i];
        val = parseInt(val, 10);

        if (isNaN(val)) throw new Error(val + ' is not a valid number');
        if (self._isPercentage() && self._attr.setYExtents[extent]) return  val / 100;
        return val;
      });
    };

    YAxis.prototype._validateAxisExtents = function (min, max) {
      if (min === max) throw new errors.NoResults();
      if (min > max) throw new errors.YMinGreaterThanYMax();
    };

    YAxis.prototype._getExtents = function (domain) {
      var min = domain[0];
      var max = domain[1];

      this._validateAxisExtents(min, max);
      if (this._attr.scale === 'log') return this._logDomain(min, max); // Negative values cannot be displayed with a log scale.
      if (!this._isYExtents() && !this._isUserDefined()) return [Math.min(0, min), Math.max(0, max)];
      if (this._isUserDefined()) return this._validateUserExtents(domain);
      return domain;
    };

    YAxis.prototype._throwCustomError = function (message) {
      throw new Error(message);
    };

    YAxis.prototype._throwCannotLogScaleNegVals = function () {
      throw new errors.CannotLogScaleNegVals();
    };

    /**
     * Returns the appropriate D3 scale
     *
     * @param fnName {String} D3 scale
     * @returns {*}
     */
    YAxis.prototype._getScaleType = function (fnName) {
      if (fnName === 'square root') fnName = 'sqrt'; // Rename 'square root' to 'sqrt'
      fnName = fnName || 'linear';

      if (typeof d3.scale[fnName] !== 'function') return this._throwCustomError('YAxis.getScaleType: ' + fnName + ' is not a function');

      return d3.scale[fnName]();
    };

    /**
     * Return the domain for log scale, i.e. the extent of the log scale.
     * Log scales must begin at 1 since the log(0) = -Infinity
     *
     * @param scale
     * @param yMin
     * @param yMax
     * @returns {*[]}
     */
    YAxis.prototype._logDomain = function (min, max) {
      if (min < 0 || max < 0) return this._throwCannotLogScaleNegVals();
      return [Math.max(1, min), max];
    };

    /**
     * Creates the d3 y scale function
     *
     * @method getYScale
     * @param height {Number} DOM Element height
     * @returns {D3.Scale.QuantitiveScale|*} D3 yScale function
     */
    YAxis.prototype.getYScale = function (height) {
      var scale = this._getScaleType(this._attr.scale);
      var domain = this._getExtents(this.domain);

      this.yScale = scale
      .domain(domain)
      .range([height, 0])
      .clamp(true);

      if (!this._isUserDefined()) this.yScale.nice(); // round extents when not user defined
      return this.yScale;
    };

    /**
     * By default, d3.format('s') returns billion values
     * with a `G` instead of a `B`. @method formatAxisLabel returns
     * billion values with a B instead of a G. Else, it defaults
     * to the d3.format('s') value.
     *
     * @method formatAxisLabel
     * @param d {Number}
     * @returns {*}
     */
    YAxis.prototype.formatAxisLabel = function (d) {
      return numeral(d).format('0.[0]a');
    };

    YAxis.prototype._isDecimalFormat = function (domain) {
      return (domain[1] <= 100 && domain[0] >= -100 && !this._isPercentage());
    };

    YAxis.prototype.tickFormat = function (domain) {
      if (this._isPercentage()) return d3.format('%');
      if (this._isDecimalFormat(domain)) return d3.format('n');
      return this.formatAxisLabel;
    };

    YAxis.prototype._validateYScale = function (yScale) {
      if (!yScale || _.isNaN(yScale)) throw new Error('yScale is ' + yScale);
    };

    /**
     * Creates the d3 y axis function
     *
     * @method getYAxis
     * @param height {Number} DOM Element height
     * @returns {D3.Svg.Axis|*} D3 yAxis function
     */
    YAxis.prototype.getYAxis = function (height) {
      var yScale = this.getYScale(height);
      this._validateYScale(yScale);

      // Create the d3 yAxis function
      this.yAxis = d3.svg.axis()
        .scale(yScale)
        .tickFormat(this.tickFormat(this.domain))
        .ticks(this.tickScale(height))
        .orient('left');

      return this.yAxis;
    };

    /**
     * Create a tick scale for the y axis that modifies the number of ticks
     * based on the height of the wrapping DOM element
     * Avoid using even numbers in the yTickScale.range
     * Causes the top most tickValue in the chart to be missing
     *
     * @method tickScale
     * @param height {Number} DOM element height
     * @returns {number} Number of y axis ticks
     */
    YAxis.prototype.tickScale = function (height) {
      var yTickScale = d3.scale.linear()
      .clamp(true)
      .domain([20, 40, 1000])
      .range([0, 3, 11]);

      return Math.ceil(yTickScale(height));
    };

    /**
     * Renders the y axis to the visualization
     *
     * @method draw
     * @returns {Function} Renders y axis to visualization
     */
    YAxis.prototype.draw = function () {
      var self = this;
      var margin = this._attr.margin;
      var mode = this._attr.mode;
      var isWiggleOrSilhouette = (mode === 'wiggle' || mode === 'silhouette');
      var div;
      var width;
      var height;
      var svg;

      return function (selection) {

        selection.each(function () {
          var el = this;

          div = d3.select(el);
          width = $(el).width();
          height = $(el).height() - margin.top - margin.bottom;

          // Validate whether width and height are not 0 or `NaN`
          self.validateWidthandHeight(width, height);

          var yAxis = self.getYAxis(height);

          // The yAxis should not appear if mode is set to 'wiggle' or 'silhouette'
          if (!isWiggleOrSilhouette) {
            // Append svg and y axis
            svg = div.append('svg')
            .attr('width', width)
            .attr('height', height + margin.top + margin.bottom);

            svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (width - 2) + ',' + margin.top + ')')
            .call(yAxis);
          }
        });
      };
    };

    return YAxis;
  };
});
