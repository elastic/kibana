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
      d3.select(this.el).selectAll('.y-axis-div').call(this.resizeAxisLayoutForLabels());
    };

    // Return the d3 y scale
    YAxis.prototype.getYScale = function (yMax, height) {
      // save reference to y scale
      this.yScale = d3.scale.linear()
        .domain([0, yMax])
        .range([height, 0])
        .nice(this.tickScale(height));

      return this.yScale;
    };

    // Return the d3 y axis
    YAxis.prototype.getYAxis = function (yMax, height) {
      var yScale = this.getYScale(yMax, height);

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
      var yMax = this.yMax;
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

          var yAxis = self.getYAxis(yMax, height);

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

    YAxis.prototype.resizeAxisLayoutForLabels = function () {
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
            labelWidths.push(n.getBBox().width);
          });

          maxWidth = d3.max(labelWidths) + 18;
          flex = self.getFlexVal(dataType, titlespace, maxWidth, visWrap.width());
          
          // set flex values
          yAxisColWrap.css('flex', flex + ' 1');
          yAxisDiv.css('width', maxWidth + 'px');
          yAxisDivWrap.css('width', (maxWidth + 12) + 'px');
          
          // set width of svg, transform to fit axis labels
          svg.attr('width', maxWidth);
          svg.attr('transform', 'translate(0,0)');
          svg.select('g').attr('transform', 'translate(' + (maxWidth - 1) + ',10)');
        });
      };
    };

    // Return flexbox css value using linear scales
    YAxis.prototype.getFlexVal = function (dataType, titleSpace, tickWidth, visWidth) {
      var ratio;

      var seriesScale = d3.scale.linear()
        .domain([0.2, 2])
        .range([0.24, 2]);

      var rowsScale = d3.scale.linear()
        .domain([0.2, 2])
        .range([0.26, 2.6]);

      var colsScale = d3.scale.linear()
        .domain([0.2, 2])
        .range([0.16, 1.6]);

      // define ratio based on datatype
      if (dataType === 'rows') {
        ratio = rowsScale(35 * (titleSpace + tickWidth) / visWidth);
      } else if (dataType === 'columns') {
        ratio = colsScale(35 * (titleSpace + tickWidth) / visWidth);
      } else {
        ratio = seriesScale(35 * (titleSpace + tickWidth) / visWidth);
      }
      //console.log(dataType, ratio.toFixed(1), 35 * (titleSpace + tickWidth) / visWidth);
      return ratio.toFixed(1);

    };

    return YAxis;
  };
});
