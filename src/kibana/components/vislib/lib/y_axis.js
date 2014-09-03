define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));

    function YAxis(args) {
      this.el = args.el;
      this.chartData = args.chartData;
      this.dataArray = args.dataArray;
      this._attr = _.defaults(args._attr || {}, {
        stack: d3.layout.stack()
          .x(function (d) { return d.x; })
          .y(function (d) { return d.y; })
      });
    }

    _(YAxis.prototype).extend(ErrorHandler.prototype);

    YAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.y-axis-div').call(this.draw());
      d3.select(this.el).selectAll('.y-axis-div').call(this.resizeAxisLayoutForLabels());
    };

    // should be moved to yAxis class
    YAxis.prototype.isStacked = function () {
      var data = this.chartData;

      for (var i = 0; i < data.length; i++) {
        if (data[i].series.length > 1) {
          return true;
        }
      }
      return false;
    };

    // should be moved to yAxis class
    YAxis.prototype.getYMaxValue = function () {
      var self = this;
      var arr = [];

      _.forEach(this.dataArray, function (series) {
        arr.push(self.getYStackMax(series));
      });

      return _.max(arr);
    };

    // should be moved to yAxis class
    YAxis.prototype.getYStackMax = function (series) {
      var self = this;

      if (this.isStacked()) {
        series = this._attr.stack(series);
      }

      return d3.max(series, function (data) {
        return d3.max(data, function (d) {
          if (self.isStacked()) {
            return d.y0 + d.y;
          }
          return d.y;
        });
      });
    };

    YAxis.prototype.getYScale = function (height) {
      this.yMax = this.getYMaxValue();

      this.yScale = d3.scale.linear()
        .domain([0, this.yMax])
        .range([height, 0])
        .nice(this.tickScale(height));

      return this.yScale;
    };

    YAxis.prototype.getYAxis = function (height) {
      var yScale = this.getYScale(height);

      if (!yScale || _.isNaN(yScale)) {
        throw new Error('yScale is ' + yScale);
      }

      this.yAxis = d3.svg.axis()
        .scale(yScale)
        .tickFormat(d3.format('s'))
        .ticks(this.tickScale(height))
        .orient('left');

      return this.yAxis;
    };

    YAxis.prototype.tickScale = function (height) {
      // Avoid using even numbers in the yTickScale.range
      // Causes the top most tickValue in the chart to be missing
      var yTickScale = d3.scale.linear()
        .clamp(true)
        .domain([20, 40, 1000])
        .range([0, 3, 11]);

      return Math.ceil(yTickScale(height));
    };

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

          self.validateWidthandHeight(width, height);

          var yAxis = self.getYAxis(height);

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

    YAxis.prototype.getMaxLabelLength = function (labels) {
      var arr = [];

      // get max tick label length
      _.forEach(labels[0], function (n) {
        arr.push(n.getBBox().width);
      });

      return _.max(arr);
    };

    YAxis.prototype.updateLayoutForRotatedLabels = function (svg, length) {
      var margin = this._attr.margin;
      var tickspace = 14;

      length += tickspace;

      // set widths of svg, x-axis-div and x-axis-div-wrapper to fit ticklabels
      svg.attr('width', length + 6);
      d3.selectAll('.y.axis').attr('transform', 'translate(' + (length + 2) + ',' + margin.top + ')');
    };

    YAxis.prototype.resizeAxisLayoutForLabels = function (selection) {
      var self = this;
      var visEl = $(self.el);
      var div;
      var svg;
      var tick;
      //var chartwrap;
      var titlespace;
      //var xwrapper;
      //var xdiv;
      //var xdivwrapper;
      //var yspacerblock;
      //var ratio;
      var flex;
      //var chartToXaxis;
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
      //console.log('visWrap', visWrap);
      //console.log('yAxisColWrap', yAxisColWrap);
      //console.log('yAxisDivWrap', yAxisDivWrap);
      //console.log('legendColWrap', legendColWrap);

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          svg = div.select('svg');
          tick = svg.select('.tick');
          dataType = this.parentNode.__data__.series ? 'series' : this.parentNode.__data__.rows ? 'rows' : 'columns';
          labels = selection.selectAll('.tick text');
          //console.log('div', div);
          //console.log('svg', svg, svg[0]);
          //console.log('tick', tick);
          //console.log('dataType', dataType);
          //console.log('labels', labels);

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
          flex = self.getFlexVal(dataType, titlespace, tick.node().getBBox().width, legendColWrap.width(), visWrap.width());
          //console.log('maxWidth', maxWidth);
          //console.log('flex', flex);
          //console.log('bbox', tick.node().getBBox());
          
          //yAxisTitle.css('flex', 1 + ' 0 15px');
          //yAxisChartTitle.css('flex', 1 + ' 0 15px');
          //yAxisDiv.css('flex', 4 + ' 0 15px');
          yAxisColWrap.css('flex', flex + ' 1');
          //yAxisDivWrap.css('flex', flex + ' 1');

          yAxisDiv.css('width', maxWidth + 'px');
          //yAxisColWrap.css('width', (maxWidth + 12) + 'px');
          yAxisDivWrap.css('width', (maxWidth + 12) + 'px');
          svg.attr('width', maxWidth);
          svg.attr('transform', 'translate(0,0)');
          svg.select('g').attr('transform', 'translate(' + (maxWidth - 1) + ',10)');
        });
      };
    };

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
      // console.log(35 * (titleSpace + tickWidth) / visWidth);

      if (dataType === 'rows') {
        ratio = rowsScale(35 * (titleSpace + tickWidth) / visWidth);
        //console.log('rows', ratio.toFixed(1));
      } else if (dataType === 'columns') {
        ratio = colsScale(35 * (titleSpace + tickWidth) / visWidth);
        //console.log('columns', ratio.toFixed(1));
      } else {
        ratio = seriesScale(35 * (titleSpace + tickWidth) / visWidth);
        //console.log('series', ratio.toFixed(1));
      }
      return ratio.toFixed(1);

    };

    return YAxis;
  };
});
