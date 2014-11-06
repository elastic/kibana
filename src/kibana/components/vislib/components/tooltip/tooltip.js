define(function (require) {
  return function TooltipFactory(d3, Private) {
    var $ = require('jquery');

    require('css!components/vislib/styles/main');

    /**
     * Add tooltip and listeners to visualization elements
     *
     * @class Tooltip
     * @constructor
     * @param el {HTMLElement} Reference to DOM element
     * @param formatter {Function} Tooltip formatter
     * @param events {Constructor} Allows tooltip to return event response data
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

      this.$window = $(window);
      this.$chart = $(el).find('.' + this.containerClass);
    }

    /**
     * Calculates values for the tooltip placement
     *
     * @method getTooltipPlacement
     * @param event {Object} D3 Events Object
     * @returns {{Object}} Coordinates for tooltip
     */
    Tooltip.prototype.getTooltipPlacement = require('components/vislib/components/tooltip/_position_tooltip');

    /**
     * Renders tooltip
     *
     * @method render
     * @returns {Function} Renders tooltip on a D3 selection
     */
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

        selection.each(function (d, i) {
          var element = d3.select(this);

          element
          .on('mousemove.tip', function () {
            var placement = self.getTooltipPlacement(
              self.$window,
              self.$chart,
              $('.' + self.tooltipClass),
              d3.event
            );
            if (!placement) return;

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

    return Tooltip;
  };
});
