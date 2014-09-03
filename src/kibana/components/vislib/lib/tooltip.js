define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    /*
     * Append a tooltip div element to the visualization
     * arguments:
     *  el => reference to DOM element
     *  formatter => tooltip formatter
     */
    function Tooltip(el, formatter) {
      if (!(this instanceof Tooltip)) {
        return new Tooltip(el, formatter);
      }

      this.el = el;
      this.tooltipFormatter = formatter;
      // hard coded class name for the tooltip `div`
      this.tooltipClass = 'k4tip';
      // reference to the width and height of the chart DOM elements
      // establishes the bounds for the tooltip per chart
      this.chartWidth = $('.chart').width();
      this.chartHeight = $('.chart').height();
    }

    Tooltip.prototype.render = function () {
      var self = this;

      return function (selection) {
        selection.each(function () {
          var tooltipDiv = d3.select(self.el).select('.' + self.tooltipClass);
          // DOM element on which the tooltip is called
          var element = d3.select(this);

          element
            .on('mousemove.tip', function (d) {
              // Calculate the x and y coordinates of the mouse on the page
              var mouseMove = {
                left: d3.event.x,
                top: d3.event.y
              };

              var chartWidth = self.chartWidth;
              var offsetX = d3.event.offsetX;
              var tipWidth = tooltipDiv[0][0].clientWidth;
              var xOffset = 10;
              // check position of tooltip relative to chart width 
              // to apply offset if tooltip should flip 'west'
              if ((chartWidth - offsetX) < tipWidth) {
                xOffset = -10 - tipWidth;
              }

              var chartHeight = self.chartHeight;
              var offsetY = d3.event.offsetY;
              var tipHeight = tooltipDiv[0][0].clientHeight;
              var yOffset = 5;
              // apply y offset to keep tooltip within bottom of chart
              if ((chartHeight - offsetY + 10) < (tipHeight)) {
                yOffset = tipHeight - (chartHeight - offsetY + 5);
              }

              // return text and position for tooltip
              return tooltipDiv.datum(d)
                .text(self.tooltipFormatter)
                .style('visibility', 'visible')
                .style('left', mouseMove.left + xOffset + 'px')
                .style('top', mouseMove.top - yOffset + 'px');
            })
            .on('mouseout.tip', function () {
              // Hide tooltip
              return tooltipDiv.style('visibility', 'hidden');
            });
        });
      };
    };

    return Tooltip;
  };
});
