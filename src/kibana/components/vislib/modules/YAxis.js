define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/modules/_chart'));

    _(YAxis).inherits(Chart);
    function YAxis(args) {
      YAxis.Super.apply(this, arguments);
      this.el = args.el;
      this.yMax = args.yMax;
      this._attr = args.attr;
    }

    YAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.y-axis-div').call(this.draw());
    };

    YAxis.prototype.getYScale = function (height) {
      this.yScale = d3.scale.linear()
        .domain([0, this.yMax])
        .range([height, 0])
        .nice(this.tickScale(height));

      return this.yScale;
    };

    YAxis.prototype.getYAxis = function (height) {
      var yScale = this.getYScale(height);

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
          self.validateHeightAndWidth(div, width, height);

          // Return access to the yAxis
          var yAxis = self.getYAxis(height);

          svg = div.append('svg')
            .attr('width', width)
            .attr('height', height + margin.top + margin.bottom);

          svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (width - 2) + ',' + margin.top + ')')
            .call(self.yAxis);

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
      console.log(svg);
      svg.attr('width', length + 6);
      d3.selectAll('.y.axis').attr('transform', 'translate(' + (length + 2) + ',' + margin.top + ')');
    };

    return YAxis;
  };
});
