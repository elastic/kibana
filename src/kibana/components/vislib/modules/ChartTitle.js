define(function (require) {
  return function ChartTitleFactory(d3) {
    var $ = require('jquery');

    function ChartTitle(type, splits) {
      this.splitType = type;
      this.splitArray = splits;
      this.divClass = this.splitType === 'rows' ? 'y-axis-chart-title' : 'x-axis-chart-title';
      this.removeClass = this.splitType === 'rows' ? 'x-axis-chart-title' : 'y-axis-chart-title';
    }

    ChartTitle.prototype.append = function () {
      var self = this;

      d3.select('.' + this.divClass).selectAll('chart-title').append('div')
        .data(this.splitArray)
        .enter().append('div')
        .attr('class', 'chart-title')
        .append('svg')
        .attr('width', $('.chart-title').width())
        .attr('height', $('.chart-title').height())
        .append('text')
        .attr('transform', function () {
          var width = $('.chart-title').width();
          var height = $('.chart-title').height();
          if (self.splitType === 'rows') {
            return 'translate(' + width + ',' + height / 2 + ')rotate(270)';
          }
          return 'translate(' + width / 2 + ',' + height / 2 + ')';
        })
        .attr('text-anchor', 'middle')
        .text(function (d) {
          return d.label;
        });

      this.remove(this.removeClass);
    };

    ChartTitle.prototype.remove = function (divClass) {
      d3.select('.' + divClass).style('flex', '0 1');
    };

    return ChartTitle;
  };
});
