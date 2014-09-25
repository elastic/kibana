define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));

    /*
     * Append a y axis to the visualization
     * arguments:
     *  el => reference to DOM element
     *  _attr => visualization attributes
     */
    function YAxis(args) {
      this.el = args.el;
      this.yMax = args.yMax;
      this._attr = _.defaults(args._attr || {}, {});
    }

    _(YAxis.prototype).extend(ErrorHandler.prototype);

    // Render the y axis
    YAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.y-axis-div').call(this.draw());
    };

    // Return the d3 y scale
    YAxis.prototype.getYScale = function (height) {
      // save reference to y scale
      this.yScale = d3.scale.linear()
        .domain([0, this.yMax])
        .range([height, 0])
        .nice(this.tickScale(height));

      return this.yScale;
    };

    // Return the d3 y axis
    YAxis.prototype.getYAxis = function (height) {
      var yScale = this.getYScale(height);

      // y scale should never be `NaN`
      if (!yScale || _.isNaN(yScale)) {
        throw new Error('yScale is ' + yScale);
      }

      // Create the d3 yAxis function
      this.yAxis = d3.svg.axis()
        .scale(yScale)
        .tickFormat(d3.format('s'))
        .ticks(this.tickScale(height))
        .orient('left');

      if (this.yScale.domain()[1] <= 10) {
        this.yAxis.tickFormat(d3.format('n'));
      }

      return this.yAxis;
    };

    // Create a tick scale for the y axis that modifies the number of ticks
    // based on the height of the wrapping DOM element
    YAxis.prototype.tickScale = function (height) {
      // Avoid using even numbers in the yTickScale.range
      // Causes the top most tickValue in the chart to be missing
      var yTickScale = d3.scale.linear()
        .clamp(true)
        .domain([20, 40, 1000])
        .range([0, 3, 11]);

      return Math.ceil(yTickScale(height));
    };

    // Return a function that renders the y axis
    YAxis.prototype.draw = function () {
      var self = this;
      var margin = this._attr.margin;
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

          // Append svg and y axis
          svg = div.append('svg')
            .attr('width', width)
            .attr('height', height + margin.top + margin.bottom);

          svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (width - 2) + ',' + margin.top + ')')
            .call(yAxis);
        });
      };
    };

    return YAxis;
  };
});
