define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));

    /*
     * Append a y axis to the visualization
     * arguments:
     *  el => reference to DOM element
     *  chartData => array(s) of x and y value objects
     *  dataArray => flattened array of all value (x, y) objects
     *  _attr => visualization attributes
     */
    function YAxis(args) {
      this.el = args.el;
      this.chartData = args.chartData;
      this.dataArray = args.dataArray;
      this._attr = _.defaults(args._attr || {}, {
        // d3 stack function
        stack: d3.layout.stack()
          .x(function (d) { return d.x; })
          .y(function (d) { return d.y; })
      });
    }

    _(YAxis.prototype).extend(ErrorHandler.prototype);

    // Render the y axis
    YAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.y-axis-div').call(this.draw());
    };

    // Determine if data should be stacked
    YAxis.prototype.isStacked = function () {
      var data = this.chartData;

      // if the length of the series array is > 1, stack is true
      for (var i = 0; i < data.length; i++) {
        if (data[i].series.length > 1) {
          return true;
        }
      }
      return false;
    };

    // Calculate the max y value from this.dataArray
    YAxis.prototype.getYMaxValue = function () {
      var self = this;
      var arr = [];

      // for each object in the dataArray,
      // push the calculated y value to the initialized array (arr)
      _.forEach(this.dataArray, function (series) {
        arr.push(self.getYStackMax(series));
      });

      // return the largest value from the array
      return _.max(arr);
    };

    // Calculate the y value from the value object
    YAxis.prototype.getYStackMax = function (series) {
      var self = this;

      // Determine if the data should be stacked
      if (this.isStacked()) {
        // if true, stack data
        series = this._attr.stack(series);
      }

      // Return the calculated y value
      return d3.max(series, function (data) {
        return d3.max(data, function (d) {
          // if stacked, need to add d.y0 + d.y for the y value
          if (self.isStacked()) {
            return d.y0 + d.y;
          }
          return d.y;
        });
      });
    };

    // Return the d3 y scale
    YAxis.prototype.getYScale = function (height) {
      // save reference to max y value
      this.yMax = this.getYMaxValue();

      // save reference to y scale
      this.yScale = d3.scale.linear()
        .domain([0, this.yMax])
        .range([height, 0])
        .nice(this.tickScale(height));

      return this.yScale;
    };

    // Return the d3 y axis
    YAxis.prototype.getYAxis = function (height) {
      var self = this;
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

      if (self.yScale.domain()[1] <= 10) {
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
          div = d3.select(this);
          width = $(this).width();
          height = $(this).height() - margin.top - margin.bottom;

          // Validate whether width and height are not 0 or `NaN`
          console.log('y-axis', width, height);
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
