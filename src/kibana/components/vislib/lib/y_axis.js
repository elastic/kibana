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
      d3.select(this.el).selectAll('.y-axis-div').call(this.resizeAxisLayoutForLabels());
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

    // Returns max tick label length
    YAxis.prototype.getMaxLabelLength = function (labels) {
      var arr = [];

      // get max tick label length
      _.forEach(labels[0], function (n) {
        arr.push(n.getBBox().width);
      });

      return _.max(arr);
    };

    // Set width of svg and trnasform axis to fit labels
    YAxis.prototype.updateLayoutForRotatedLabels = function (svg, length) {
      var margin = this._attr.margin;
      var tickspace = 14;

      length += tickspace;

      // set width of svg, x-axis-div and x-axis-div-wrapper to fit ticklabels
      svg.attr('width', length + 6);
      d3.selectAll('.y.axis').attr('transform', 'translate(' + (length + 2) + ',' + margin.top + ')');
    };

    YAxis.prototype.resizeAxisLayoutForLabels = function (selection) {
      var self = this;
      var visEl = $(self.el);
      var div;
      var svg;
      var tick;
      var titlespace;
      var flex;
      var dataType;

      var visWrap = visEl.find('.vis-col-wrapper');
      var yAxisColWrap = visEl.find('.y-axis-col-wrapper');
      var yAxisDivWrap = visEl.find('.y-axis-div-wrapper');
      var yAxisDiv = visEl.find('.y-axis-div');
      var yAxisTitle = visEl.find('.y-axis-title');
      var yAxisChartTitle = visEl.find('.y-axis-chart-title');
      var legendColWrap = visEl.find('.legend-col-wrapper');
      var labelWidths = [];
      var maxWidth;
      var labels;
      
      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          svg = div.select('svg');
          tick = svg.select('.tick');
          dataType = this.parentNode.__data__.series ? 'series' : this.parentNode.__data__.rows ? 'rows' : 'columns';
          labels = selection.selectAll('.tick text');
          
          if (dataType === 'series') {
            titlespace = 15;
          } else if (dataType === 'rows') {
            titlespace = 15;
          } else {
            titlespace = 30;
          }

          // get max width tick
          _.forEach(labels[0], function (n) {
            labelWidths.push(n.getBBox().height);
          });
          maxWidth = Math.ceil(_.max(labelWidths)) + 20;
          
          // should have a tick node
          if (!tick.node()) {
            throw new Error('y-axis tick.node() is undefined');
          }

          flex = self.getFlexVal(dataType, titlespace, tick.node().getBBox().width, legendColWrap.width(), visWrap.width());
          
          // set flex values
          yAxisColWrap.css('flex', flex + ' 1');
          yAxisDiv.css('width', maxWidth + 'px');
          yAxisDivWrap.css('width', (maxWidth + 12) + 'px');
          
          // set width of svg, trnasform to fit axis labels
          svg.attr('width', maxWidth);
          svg.attr('transform', 'translate(0,0)');
          svg.select('g').attr('transform', 'translate(' + (maxWidth - 1) + ',10)');
        });
      };
    };

    // Return flexbox css value using linear scales
    YAxis.prototype.getFlexVal = function (dataType, titleSpace, tickWidth, legendWidth, visWidth) {
      var ratio;
      var seriesScale = d3.scale.linear()
        .domain([0.57, 2])
        .range([1.0, 3.4]);
      var rowsScale = d3.scale.linear()
        .domain([0.5, 2])
        .range([1.1, 4.3]);
      var colsScale = d3.scale.linear()
        .domain([0.8, 2])
        .range([0.9, 2.2]);

      // define ratio based on datatype
      if (dataType === 'rows') {
        ratio = rowsScale(35 * (titleSpace + tickWidth) / visWidth);
      } else if (dataType === 'columns') {
        ratio = colsScale(35 * (titleSpace + tickWidth) / visWidth);
      } else {
        ratio = seriesScale(35 * (titleSpace + tickWidth) / visWidth);
      }
      return ratio.toFixed(1);

    };

    return YAxis;
  };
});
