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
    function Tooltip(el, formatter, events) {
      if (!(this instanceof Tooltip)) {
        return new Tooltip(el, formatter, events);
      }
      this.el = el;
      this.formatter = formatter;
      this.events = events;
      this.tooltipClass = 'vis-tooltip';
      this.containerClass = 'vis-wrapper';
    }

    Tooltip.prototype.render = function () {
      var self = this;
      var tooltipFormatter = this.formatter;

      return function (selection) {

        if (d3.select('body').select('.' + self.tooltipClass)[0][0] === null) {
          d3.select('body').append('div').attr('class', self.tooltipClass);
        }
        if (self.container === undefined || self.container !== d3.select(self.el).select('.' + self.containerClass)) {
          self.container = d3.select(self.el).select('.' + self.containerClass);
        }

        var tooltipDiv = d3.select('.' + self.tooltipClass);

        selection.each(function (data, i) {
          var element = d3.select(this);
          var offset;

          element
            .on('mousemove.tip', function (d) {
              var mouseMove = {
                left: d3.event.clientX,
                top: d3.event.clientY
              };

              offset = self.getOffsets(mouseMove);

              // return text and position for tooltip
              return tooltipDiv.datum(self.events.eventResponse(d, i))
                .html(tooltipFormatter)
                .style('visibility', 'visible')
                .style('left', mouseMove.left + offset.left + 'px')
                .style('top', mouseMove.top + offset.top + 'px');
            })
            .on('mouseout.tip', function () {
              return tooltipDiv.style('visibility', 'hidden')
                .style('left', '-500px')
                .style('top', '-500px');
            });
        });
      };
    };

    Tooltip.prototype.getOffsets = function (mouseMove) {

      var self = this;
      var offset = {top: -10, left: 10};
      
      if ($(self.el).find('.' + self.containerClass)) {
        var container = $(self.el).find('.' + self.containerClass);
        var chartXOffset = container.offset().left;
        var chartYOffset = container.offset().top;
        var chartWidth = container.width();
        var chartHeight = container.height();
        var tip = $('.' + self.tooltipClass)[0];
        var tipWidth = tip.clientWidth;
        var tipHeight = tip.clientHeight;
        
        // change xOffset to keep tooltip within container
        // if tip width + xOffset puts it over right edge of container, flip left
        // unless flip left puts it over left edge of container
        // change yOffset to keep tooltip within container
        if (mouseMove.left + offset.left + tipWidth > chartXOffset + chartWidth &&
          mouseMove.left - tipWidth - 10 > chartXOffset) {
          offset.left = -10 - tipWidth;
        }
        if (mouseMove.top + tipHeight - 10 > chartYOffset + chartHeight) {
          offset.top = chartYOffset + chartHeight;
        }
      }
      
      return offset;
    };

    return Tooltip;
  };
});
