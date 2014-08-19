define(function (require) {
  return function ChartTitleFactory(d3) {
    var $ = require('jquery');

    function ChartTitle(el, type) {
      this.el = el;
      this.splitType = type;
    }

    ChartTitle.prototype.render = function () {
      d3.select(this.el).selectAll('.chart-title').call(this.appendTitles());
    };

    ChartTitle.prototype.appendTitles = function () {
      var self = this;

      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);
          var width = $(this).width();
          var height = $(this).height();

          div.append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('text')
            .attr('transform', function () {
              if (self.splitType === 'rows') {
                return 'translate(' + width + ',' + height / 2 + ')rotate(270)';
              }
              return 'translate(' + width / 2 + ',' + height * 0.8 + ')';
            })
            .attr('text-anchor', 'middle')
            .text(function (d) {
              return d.label;
            });
        });
      };
    };

    return ChartTitle;
  };
});
