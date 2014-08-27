define(function (require) {
  return function ChartTitleFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));

    _(ChartTitle).inherits(Chart);
    function ChartTitle(el, type) {
      ChartTitle.Super.apply(this, arguments);
      this.el = el;
      this.dataType = type;
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

          self.validateHeightAndWidth(div, width, height);

          div.append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('text')
            .attr('transform', function () {
              if (self.dataType === 'rows') {
                // return 'translate(' + width * 0.95 + ',' + height / 2 + ')rotate(270)';
                return 'translate(11,' + height / 2 + ')rotate(270)';
              }
              // problem: 'height' var grows with each column, causing layout issue
              // return 'translate(' + width / 2 + ',' + height * 0.7 + ')';
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
