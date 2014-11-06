define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

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
      this.yMax = args.yMax;
      this._attr = _.defaults(args._attr || {}, {});
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

    /**
     * Creates the d3 y scale function
     *
     * @method getYScale
     * @param height {Number} DOM Element height
     * @returns {D3.Scale.QuantitiveScale|*} D3 yScale function
     */
    YAxis.prototype.getYScale = function (height) {
      // save reference to y scale
      this.yScale = d3.scale.linear()
      .domain([0, this.yMax])
      .range([height, 0])
      .nice(this.tickScale(height));

      return this.yScale;
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
      var isPercentage = (this._attr.mode === 'percentage');
      var tickFormat;

      if (isPercentage) {
        tickFormat = d3.format('%');
      } else if (this.yMax <= 100 && !isPercentage) {
        tickFormat = d3.format('n');
      } else {
        tickFormat = d3.format('s');
      }

      // y scale should never be `NaN`
      if (!yScale || _.isNaN(yScale)) {
        throw new Error('yScale is ' + yScale);
      }

      // Create the d3 yAxis function
      this.yAxis = d3.svg.axis()
        .scale(yScale)
        .tickFormat(tickFormat)
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
