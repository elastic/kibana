define(function (require) {
  return function AxisTitleFactory(d3) {
    var $ = require('jquery');

    function AxisTitle(el, xTitle, yTitle) {
      this.el = el;
      this.xTitle = xTitle;
      this.yTitle = yTitle;
    }

    AxisTitle.prototype.render = function () {
      d3.select(this.el).select('.x-axis-title').call(this.appendAxisTitle(this.xTitle));
      d3.select(this.el).select('.y-axis-title').call(this.appendAxisTitle(this.yTitle));
    };

    AxisTitle.prototype.appendAxisTitle = function (title) {
      return function (selection) {
        var self = this;
        var div;
        var width;
        var height;

        selection.each(function () {
          div = d3.select(this);
          width = $(this).width();
          height = $(this).height();

          div.append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('text')
            .attr('transform', function () {
              if (div.attr('class') === 'x-axis-title') {
                return 'translate(' + width / 2 + ',' + height / 2 + ')';
              }
              return 'translate(' + width + ',' + height / 2 + ')rotate(270)';
            })
            .attr('text-anchor', 'middle')
            .text(title);
        });
      };
    };

    return AxisTitle;
  };
});
