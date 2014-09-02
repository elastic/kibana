define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    function Tooltip(formatter) {
      if (!(this instanceof Tooltip)) {
        return new Tooltip(formatter);
      }

      this.tooltipFormatter = formatter;
      this.tooltipClass = 'k4tip';
      this.chartWidth = $('.chart').width();
      this.chartHeight = $('.chart').height();
    }

    Tooltip.prototype.render = function () {
      var self = this;

      return function (selection) {
        selection.each(function () {
          var tooltipDiv = d3.select('.' + self.tooltipClass);
          var element = d3.select(this);

          element
            .on('mousemove.tip', function (d) {
              var mouseMove = {
                left: d3.event.x,
                top: d3.event.y
              };

              var chartWidth = self.chartWidth;
              var offsetX = d3.event.offsetX;
              var tipWidth = tooltipDiv[0][0].clientWidth;
              var xOffset = 10;
              if ((chartWidth - offsetX) < tipWidth) {
                xOffset = -10 - tipWidth;
              }

              var chartHeight = self.chartHeight;
              var offsetY = d3.event.offsetY;
              var tipHeight = tooltipDiv[0][0].clientHeight;
              var yOffset = 5;
              if ((chartHeight - offsetY + 10) < (tipHeight)) {
                yOffset = tipHeight - (chartHeight - offsetY + 5);
              }

              return tooltipDiv.datum(d)
                .text(self.tooltipFormatter)
                .style('visibility', 'visible')
                .style('left', mouseMove.left + xOffset + 'px')
                .style('top', mouseMove.top - yOffset + 'px');
            })
            .on('mouseout.tip', function () {
              return tooltipDiv.style('visibility', 'hidden');
            });
        });
      };
    };

    return Tooltip;
  };
});
