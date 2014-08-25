define(function (require) {
  return function AxisTitleFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));

    _(AxisTitle).inherits(Chart);
    function AxisTitle(el, xTitle, yTitle) {
      AxisTitle.Super.apply(this, arguments);
      this.el = el;
      this.xTitle = xTitle;
      this.yTitle = yTitle;
    }

    AxisTitle.prototype.render = function () {
      d3.select(this.el).select('.x-axis-title').call(this.appendAxisTitle(this.xTitle));
      d3.select(this.el).select('.y-axis-title').call(this.appendAxisTitle(this.yTitle));
    };

    AxisTitle.prototype.appendAxisTitle = function (title) {
      var self = this;
      var div;
      var width;
      var height;

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          width = $(this).width();
          height = $(this).height();

          self.validateHeightAndWidth(div, width, height);

          div.append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('text')
            .attr('transform', function () {
              if (div.attr('class') === 'x-axis-title') {
                return 'translate(' + width / 2 + ',' + height * 0.7 + ')';
              }
              return 'translate(' + width * 0.7 + ',' + height / 2 + ')rotate(270)';
            })
            .attr('text-anchor', 'middle')
            .text(title);
        });
      };
    };

    return AxisTitle;
  };
});
