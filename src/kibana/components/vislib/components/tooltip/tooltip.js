define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');
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
      this.containerClass = 'vis-wrapper';
      this.tooltipClass = 'vis-tooltip';
      this.tooltipSizerClass = 'vis-tooltip-sizing-clone';

      this.$window = $(window);
      this.$chart = $(el).find('.' + this.containerClass);
    }

    Tooltip.prototype.$get = _.once(function () {
      return $('<div>').addClass(this.tooltipClass).appendTo(document.body);
    });

    Tooltip.prototype.$getSizer = _.once(function () {
      return this.$get()
      .clone()
        .removeClass(this.tooltipClass)
        .addClass(this.tooltipSizerClass)
        .appendTo(document.body);
    });

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
        var $tooltip = self.$get();
        var $sizer = self.$getSizer();
        var tooltipSelection = d3.select($tooltip.get(0));

        if (self.container === undefined || self.container !== d3.select(self.el).select('.' + self.containerClass)) {
          self.container = d3.select(self.el).select('.' + self.containerClass);
        }

        selection.each(function (d, i) {
          var element = d3.select(this);

          element
          .on('mousemove.tip', function () {
            var placement = self.getTooltipPlacement(
              self.$window,
              self.$chart,
              $tooltip,
              $sizer,
              d3.event
            );
            if (!placement) return;

            var events = self.events ? self.events.eventResponse(d, i) : d;

            // return text and position for tooltip
            return tooltipSelection.datum(events)
              .html(tooltipFormatter)
              .style('visibility', 'visible')
              .style('left', placement.left + 'px')
              .style('top', placement.top + 'px');
          })
          .on('mouseout.tip', function () {
            return tooltipSelection.style('visibility', 'hidden')
              .style('left', '-500px')
              .style('top', '-500px');
          });
        });
      };
    };

    return Tooltip;
  };
});
