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
        .nice();
    };

    YAxis.prototype.getYAxis = function (height) {
      this.getYScale(height);

      this.yAxis = d3.svg.axis()
        .scale(this.yScale)
        .tickFormat(d3.format('s'))
        .orient('left');
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
          self.getYAxis(height);

          svg = div.append('svg')
            .attr('width', width)
            .attr('height', height + margin.top + margin.bottom);

          svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + width + ',' + margin.top + ')')
            .call(self.yAxis);
        });
      };
    };

    return YAxis;
  };
});
