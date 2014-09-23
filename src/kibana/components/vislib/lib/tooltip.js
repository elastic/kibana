define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    // Dynamically adds css file
    require('css!components/vislib/styles/main');

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
      this.tooltipClass = 'vis-tooltip';
      this.containerClass = 'vis-wrapper';
    }

    Tooltip.prototype.render = function () {
      var self = this;
      
      return function (selection) {

        // if tooltip not appended to body, append one
        if (d3.select('body').select('.' + self.tooltipClass)[0][0] === null) {
          d3.select('body').append('div').attr('class', self.tooltipClass);
        }

        // if container not saved on Tooltip, save it
        if (self.container === undefined || self.container !== d3.select(self.el).select('.' + self.containerClass)) {
          self.container = d3.select(self.el).select('.' + self.containerClass);
        }

        var tooltipDiv = d3.select('.' + self.tooltipClass);

        selection.each(function () {
          
          // DOM element on which the tooltip is called
          var element = d3.select(this);
          
          // define selections relative to el of tooltip
          var offset;

          element
            .on('mousemove.tip', function (d) {
              // get x and y coordinates of the mouse event
              var mouseMove = {
                left: d3.event.clientX,
                top: d3.event.clientY
              };
              
              offset = self.getOffsets(tooltipDiv, mouseMove);

              // return text and position for tooltip
              return tooltipDiv.datum(d)
                .html(self.tooltipFormatter)
                .style('visibility', 'visible')
                .style('left', mouseMove.left + offset.left + 'px')
                .style('top', mouseMove.top + offset.top + 'px');
            })

            .on('mouseout.tip', function () {
              // hide tooltip
              return tooltipDiv.style('visibility', 'hidden');
            });
        });
      };
    };

    Tooltip.prototype.getOffsets = function (tooltipDiv, mouseMove) {

      var self = this;
      var offset = {top: 10, left: 10};

      if ($(self.el).find('.' + self.containerClass)) {
        var container    = $(self.el).find('.' + self.containerClass);
        var chartXOffset = container.offset().left;
        var chartYOffset = container.offset().top;
        var chartWidth   = container.width();
        var chartHeight  = container.height();
        var tipWidth     = tooltipDiv[0][0].clientWidth;
        var tipHeight    = tooltipDiv[0][0].clientHeight;

        // change xOffset to keep tooltip within container
        // if tip width + xOffset puts it over right edge of container, flip left
        // unless flip left puts it over left edge of container
        if ((mouseMove.left + offset.left + tipWidth) > (chartXOffset + chartWidth) &&
          (mouseMove.left - tipWidth - 10) > chartXOffset) {
          offset.left = -10 - tipWidth;
        }

        // change yOffset to keep tooltip within container
        if ((mouseMove.top + tipHeight - 10) > (chartYOffset + chartHeight)) {
          offset.top = chartYOffset + chartHeight;
        }
      }

      return offset;
    };

    return Tooltip;
  };
});
