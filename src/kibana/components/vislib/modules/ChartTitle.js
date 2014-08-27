define(function (require) {
  return function ChartTitleFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));

    _(ChartTitle).inherits(Chart);
    function ChartTitle(el) {
      if (!(this instanceof ChartTitle)) {
        return new ChartTitle(el);
      }

      ChartTitle.Super.apply(this, arguments);
      this.el = el;
    }

    ChartTitle.prototype.render = function () {
      d3.select(this.el).selectAll('.chart-title').call(this.draw());
    };
    
    ChartTitle.prototype.draw = function () {
      var self = this;

      return function (selection) {
        // Determines whether the data are in rows or columns, which is needed
        // for the chart title placement.
        var parentNode = selection[0].parentNode;
        var dataType = parentNode.__data__.rows ? 'rows' : 'columns';

        selection.each(function () {
          var div = d3.select(this);
          var width = $(this).width();
          var height = $(this).height();

          self.validateHeightAndWidth(div, width, height);

          div.append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('text')
            .attr('transform', function () {
              if (dataType === 'rows') {
                return 'translate(11,' + height / 2 + ')rotate(270)';
              }
              return 'translate(' + width / 2 + ',' + 17 * 0.7 + ')';
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
