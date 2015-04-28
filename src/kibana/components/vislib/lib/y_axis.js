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
      this.yMin = args.yMin;
      this.yMax = args.yMax;
      this.tickFormat = args.tickFormat;
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

    YAxis.prototype.throwCustomError = function (message) {
      throw new Error(message);
    };

    YAxis.prototype.throwCannotLogScaleNegVals = function () {
      throw new errors.CannotLogScaleNegVals();
    };

    YAxis.prototype.throwNoResultsError = function () {
      throw new errors.NoResults();
    };

    /**
     * Returns the appropriate D3 scale
     *
     * @param fnName {String} D3 scale
     * @returns {*}
     */
    YAxis.prototype.getScaleType = function (fnName) {
      if (fnName === 'square root') fnName = 'sqrt'; // Rename 'square root' to 'sqrt'
      fnName = fnName || 'linear';

      if (typeof d3.scale[fnName] !== 'function') return this.throwCustomError('YAxis.getScaleType: ' + fnName + ' is not a function');

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
    YAxis.prototype.returnLogDomain = function (yMin, yMax) {
      if (yMin < 0 || yMax < 0) return this.throwCannotLogScaleNegVals();
      return [Math.max(1, yMin), yMax];
    };

    /**
     * Returns the domain, i.e. the extent of the y axis
     *
     * @param scale {String} Kibana scale
     * @param yMin {Number} Y-axis minimum value
     * @param yMax {Number} Y-axis maximum value
     * @returns {*[]}
     */
    YAxis.prototype.getDomain = function (scale, yMin, yMax) {
      if (scale === 'log') return this.returnLogDomain(yMin, yMax); // Negative values cannot be displayed with a log scale.
      if (yMin === 0 && yMax === 0) return this.throwNoResultsError(); // yMin and yMax can never both be equal to zero

      return [Math.min(0, yMin), Math.max(0, yMax)];
    };

    /**
     * Creates the d3 y scale function
     *
     * @method getYScale
     * @param height {Number} DOM Element height
     * @returns {D3.Scale.QuantitiveScale|*} D3 yScale function
     */
    YAxis.prototype.getYScale = function (height) {
      return this.yScale = this.getScaleType(this._attr.scale)
      .domain(this.getDomain(this._attr.scale, this.yMin, this.yMax))
      .range([height, 0])
      .nice();
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

      // y scale should never be `NaN`
      if (!yScale || _.isNaN(yScale)) {
        throw new Error('yScale is ' + yScale);
      }

      // Create the d3 yAxis function
      this.yAxis = d3.svg.axis()
        .scale(yScale)
        .tickFormat(this.tickFormat)
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
