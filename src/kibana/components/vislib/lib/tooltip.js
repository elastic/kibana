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

          element
            .on('mousemove.tip', function (d) {
              var placement = self.getTooltipPlacement(d3.event);
              var events = self.events ? self.events.eventResponse(d, i) : d;

              // return text and position for tooltip
              return tooltipDiv.datum(events)
                .html(tooltipFormatter)
                .style('visibility', 'visible')
                .style('left', placement.left + 'px')
                .style('top', placement.top + 'px');
            })
            .on('mouseout.tip', function () {
              return tooltipDiv.style('visibility', 'hidden')
                .style('left', '-500px')
                .style('top', '-500px');
            });
        });
      };
    };

    Tooltip.prototype.getTooltipPlacement = function (event) {
      var self = this;
      var OFFSET = 10;

      var chart = $(self.el).find('.' + self.containerClass);
      if (!chart.size()) return;

      var chartPos = chart.offset();
      chartPos.right = chartPos.left + chart.outerWidth();
      chartPos.bottom = chartPos.top + chart.outerHeight();

      var tip = $('.' + self.tooltipClass);
      var tipWidth = tip.outerWidth();
      var tipHeight = tip.outerHeight();

      // the placements if we were to place the tip east or west
      var left = {
        east: event.clientX + OFFSET,
        west: event.clientX - tipWidth - OFFSET
      };

      // the placements if we were to place the tip north or south
      var top = {
        south: event.clientY + OFFSET,
        north: event.clientY - tipHeight - OFFSET
      };

      // number of pixels that the toolip would overflow it's far
      // side, if we placed it that way. (negative === no overflow)
      var overflow = {
        north: chartPos.top - top.north,
        east: (left.east + tipWidth) - chartPos.right,
        south: (top.south + tipHeight) - chartPos.bottom,
        west: chartPos.left - left.west
      };

      var placement = {};

      if (overflow.south > 0) {
        if (overflow.north < 0) {
          placement.top = top.north;
        } else {
          placement.top = top.south - overflow.south;
        }
      } else {
        placement.top = top.south;
      }

      if (overflow.east > 0) {
        if (overflow.west < 0) {
          placement.left = left.west;
        } else {
          placement.left = left.east - overflow.east;
        }
      } else {
        placement.left = left.east;
      }

      return placement;
    };

    return Tooltip;
  };
});
