define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var split = Private(require('components/vislib/components/YAxis/_split'));

    function YAxis(el, yMax, height, margin) {
      this.el = el;
      this.yMax = yMax;
      this.margin = margin;
      this.height = height - margin.top - margin.bottom;
    }

    YAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.y-axis-div').call(this.appendSVG());
    };

    YAxis.prototype.getYScale = function () {
      this.yScale = d3.scale.linear()
        .domain([0, this.yMax])
        .range([this.height, 0])
        .nice();
    };

    YAxis.prototype.getYAxis = function () {
      this.getYScale();

      this.yAxis = d3.svg.axis()
        .scale(this.yScale)
        .tickFormat(d3.format('s'))
        .orient('left');
    };

    YAxis.prototype.appendSVG = function () {
      var self = this;
      var div;
      var width;
      var height;
      var svg;

      this.getYAxis();

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          width = $(this).width();
          height = $(this).height() - self.margin.top - self.margin.bottom;

          svg = div.append('svg')
            .attr('width', width)
            .attr('height', height + self.margin.top + self.margin.bottom);

          svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + width + ',' + self.margin.top + ')')
            .call(self.yAxis);
        });
      };
    };

    return YAxis;
  };
});
