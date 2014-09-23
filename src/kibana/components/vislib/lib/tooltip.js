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
          var chartXoffset;
          var chartWidth;
          var chartHeight;
          var yaxisWidth;
          var offset;
          var tipWidth;
          var tipHeight;

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
      var container;
      var chartXoffset;
      var chartYoffset;
      var chartWidth;
      var chartHeight;
      var tipWidth;
      var tipHeight;
      var offsetLeft;
      var offsetTop;
      var minLeft;
      var tipOffset = 10;
      var offset = {top: -tipOffset, left: tipOffset};
      
      // change xOffset to keep tooltip within container
      // if tip width + xOffset puts it over right edge of container, flip left
      // unless flip left puts it over left edge of container
      // change yOffset to keep tooltip within bottom of container
      if ($(self.el).find('.' + self.containerClass)) {
        container    = $(self.el).find('.' + self.containerClass);
        chartXoffset = container.offset().left;
        chartYoffset = container.offset().top;
        chartWidth   = container.width();
        chartHeight  = container.height();
        tipWidth     = tooltipDiv[0][0].clientWidth;
        tipHeight    = tooltipDiv[0][0].clientHeight;

        offsetLeft = chartXoffset + chartWidth - mouseMove.left - tipWidth - tipOffset;
        if (offsetLeft < 0) {
          offset.left = 0 - tipWidth - tipOffset;
        }

        offsetTop = chartYoffset + chartHeight - mouseMove.top - tipHeight + tipOffset;
        if (offsetTop < 0) {
          offset.top = offsetTop - tipOffset;
        }
      }

      return offset;
    };

    return Tooltip;
  };
});
