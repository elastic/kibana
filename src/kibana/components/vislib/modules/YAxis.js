define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var split = Private(require('components/vislib/components/YAxis/_split'));

    function YAxis(data, yMax) {
      this.data = data;
      this.yMax = yMax;
    }

    YAxis.prototype.getYScale = function () {
      this.yScale = d3.scale.linear()
        .domain([0, this.yMax])
        .range([this.height, 0])
        .nice();
    };

    YAxis.prototype.getYAxis = function () {
      this.yAxis = d3.svg.axis()
        .scale(this.yScale)
        .tickFormat(d3.format('s'))
        .orient('left');
    };

    YAxis.prototype.appendSVG = function (self) {
      console.log(self);
      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);

          var svg = div.append('svg')
            .attr('width', self.width)
            .attr('height', self.height + 10);

          svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + self.width + ',5)')
            .call(self.yAxis);
        });
      };
    };

    YAxis.prototype.draw = function () {
      d3.select('.y-axis-div-wrapper').datum(this.data.data).call(split);

      this.height = $('.y-axis-div').height();
      this.width = $('.y-axis-div').width();

      this.getYScale();
      this.getYAxis();
      d3.selectAll('.y-axis-div').call(this.appendSVG(this));
    };

    YAxis.prototype.ticks = function () {};
    YAxis.prototype.title = function () {};
    YAxis.prototype.chartTitle = function () {};

    return YAxis;
  };
});
