define(function (require) {
  return function TooltipFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');
    var positionTooltip = require('components/vislib/components/tooltip/_position_tooltip');

    var allContents = [];

    require('components/vislib/styles/main.less');

    /**
     * Add tooltip and listeners to visualization elements
     *
     * @class Tooltip
     * @constructor
     * @param el {HTMLElement} Reference to DOM element
     * @param formatter {Function} Tooltip formatter
     * @param events {Constructor} Allows tooltip to return event response data
     */
    function Tooltip(id, el, formatter, events) {
      if (!(this instanceof Tooltip)) {
        return new Tooltip(id, el, formatter, events);
      }

      this.id = id; // unique id for this tooltip type
      this.el = el;
      this.order = 100; // higher ordered contents are rendered below the others
      this.formatter = formatter;
      this.events = events;
      this.containerClass = 'vis-wrapper';
      this.tooltipClass = 'vis-tooltip';
      this.tooltipSizerClass = 'vis-tooltip-sizing-clone';
      this.showCondition = _.constant(true);
    }

    /**
     * Get jquery reference to the tooltip node
     *
     * @return {Object} jQuery node object
     */
    Tooltip.prototype.$get = _.once(function () {
      return $('<div>').addClass(this.tooltipClass).appendTo(document.body);
    });

    /**
     * Get jquery reference to the tooltip sizer node
     *
     * @return {Object} jQuery node object
     */
    Tooltip.prototype.$getSizer = _.once(function () {
      return this.$get()
      .clone()
      .removeClass(this.tooltipClass)
      .addClass(this.tooltipSizerClass)
      .appendTo(document.body);
    });

    /**
     * Show the tooltip, positioning it based on the content and chart container
     */
    Tooltip.prototype.show = function () {
      var $tooltip = this.$get();
      var $chart = this.$getChart();
      var html = $tooltip.html();

      if (!$chart) return;

      var placement = positionTooltip({
        $window: $(window),
        $chart: $chart,
        $el: $tooltip,
        $sizer: this.$getSizer(),
        event: d3.event
      }, html);

      $tooltip.css({
        visibility: 'visible',
        left: placement.left,
        top: placement.top
      });
    };

    /**
     * Hide the tooltip, clearing its contents
     */
    Tooltip.prototype.hide = function () {
      var $tooltip = this.$get();
      allContents = [];
      $tooltip.css({
        visibility: 'hidden',
        left: '-500px',
        top: '-500px'
      });
    };

    /**
     * Get the jQuery chart node, based on the container object
     * NOTE: the container is a d3 selection
     *
     * @return {Object} jQuery node for the chart
     */
    Tooltip.prototype.$getChart = function () {
      var chart = $(this.container && this.container.node());
      return chart.size() ? chart : false;
    };

    /**
     * Renders tooltip
     *
     * @method render
     * @return {Function} Renders tooltip on a D3 selection
     */
    Tooltip.prototype.render = function () {
      var self = this;

      /**
       * Calculates values for the tooltip placement
       *
       * @param {Object} selection D3 selection object
       */
      return function (selection) {
        var $tooltip = self.$get();
        var id = self.id;
        var order = self.order;

        var tooltipSelection = d3.select($tooltip.get(0));

        if (self.container === undefined || self.container !== d3.select(self.el).select('.' + self.containerClass)) {
          self.container = d3.select(self.el).select('.' + self.containerClass);
        }

        var $chart = self.$getChart();
        if ($chart) {
          $chart.on('mouseleave', function (event) {
            // only clear when we leave the chart, so that
            // moving between points doesn't make it reposition
            $chart.removeData('previousPlacement');
          });
        }

        selection.each(function (d, i) {
          var element = d3.select(this);

          function render(html) {
            allContents = _.filter(allContents, function (content) {
              return content.id !== id;
            });

            if (html) allContents.push({ id: id, html: html, order: order });

            var allHtml = _(allContents)
            .sortBy('order')
            .pluck('html')
            .compact()
            .join('\n');

            if (allHtml) {
              $tooltip.html(allHtml);
              self.show();
            } else {
              self.hide();
            }
          }

          fakeD3Bind(this, 'mousemove', function () {
            if (!self.showCondition.call(element, d, i)) {
              return render();
            }

            var events = self.events ? self.events.eventResponse(d, i) : d;
            return render(self.formatter(events));
          });

          fakeD3Bind(this, 'mouseleave', function () {
            render();
          });

        });
      };
    };

    function fakeD3Bind(el, event, handler) {
      $(el).on(event, function (e) {
        // mimicing https://github.com/mbostock/d3/blob/3abb00113662463e5c19eb87cd33f6d0ddc23bc0/src/selection/on.js#L87-L94
        var o = d3.event; // Events can be reentrant (e.g., focus).
        d3.event = e;
        try {
          handler.apply(this, [this.__data__]);
        } finally {
          d3.event = o;
        }
      });
    }

    return Tooltip;
  };
});
