define(function (require) {
  return function LegendFactory(d3) {
    var _ = require('lodash');
    var legendHeaderTemplate = _.template(require('text!components/vislib/partials/legend_header.html'));

    require('css!components/vislib/styles/main');

    /**
     * Appends legend to the visualization
     *
     * @class Legend
     * @constructor
     * @param vis {Object} Reference to Vis Constructor
     * @param el {HTMLElement} Reference to DOM element
     * @param labels {Array} Array of chart labels
     * @param color {Function} Color function
     * @param _attr {Object|*} Reference to Vis options
     */
    function Legend(vis, el, labels, color, _attr) {
      if (!(this instanceof Legend)) {
        return new Legend(vis, el, labels, color, _attr);
      }

      this.vis = vis;
      this.el = el;
      this.labels = labels;
      this.color = color;
      this._attr = _.defaults(_attr || {}, {
        'legendClass' : 'legend-col-wrapper',
        'blurredOpacity' : 0.3,
        'focusOpacity' : 1,
        'defaultOpacity' : 1,
        'legendDefaultOpacity': 1,
        'isOpen' : true
      });
    }

    /**
     * Adds legend header
     *
     * @method header
     * @param el {HTMLElement} Reference to DOM element
     * @param args {Object|*} Legend options
     * @returns {*} HTML element
     */
    Legend.prototype.header = function (el, args) {
      return el.append('div')
      .attr('class', 'header')
      .append('div')
      .attr('class', 'column-labels')
      .html(function () {
        return legendHeaderTemplate(args._attr);
      });
    };

    /**
     * Adds list to legend
     *
     * @method list
     * @param el {HTMLElement} Reference to DOM element
     * @param arrOfLabels {Array} Array of labels
     * @param args {Object|*} Legend options
     * @returns {D3.Selection} HTML element with list of labels attached
     */
    Legend.prototype.list = function (el, arrOfLabels, args) {
      var self = this;

      return el.append('ul')
      .attr('class', function () {
        if (args._attr.isOpen) {
          return 'legend-ul';
        }
        return 'legend-ul hidden';
      })
      .selectAll('li')
      .data(arrOfLabels)
      .enter()
        .append('li')
        .attr('class', function (d) {
          return 'color ' + self.colorToClass(args.color(d));
        })
        .html(function (d) {
          return '<span class="dots" style="background:' + args.color(d) + '"></span>' + d;
        });
    };

    /**
     * Creates a class name based on the colors assigned to each label
     *
     * @method colorToClass
     * @param name {String} Label
     * @returns {string} CSS class name
     */
    Legend.prototype.colorToClass = function (name) {
      return 'c' + name.replace(/[#]/g, '');
    };

    /**
     * Renders legend
     *
     * @method render
     * @return {HTMLElement} Legend
     */
    Legend.prototype.render = function () {
      var self = this;
      var visEl = d3.select(this.el);
      var legendDiv = visEl.select('.' + this._attr.legendClass);
      var items = this.labels;
      this.header(legendDiv, this);
      this.list(legendDiv, items, this);

      var headerIcon = visEl.select('.legend-toggle');

      // toggle
      headerIcon
      .on('click', function legendClick() {
        if (self._attr.isOpen) {
          // close legend
          visEl.select('ul.legend-ul').classed('hidden', true);
          self._attr.isOpen = false;

          // need to add reference to resize function on toggle
          self.vis.resize();
        } else {
          // open legend
          visEl.select('ul.legend-ul').classed('hidden', false);
          self._attr.isOpen = true;

          // need to add reference to resize function on toggle
          self.vis.resize();
        }
      });

      visEl.selectAll('.color')
      .on('mouseover', function (d) {
        var liClass = '.' + self.colorToClass(self.color(d));
        visEl.selectAll('.color').style('opacity', self._attr.blurredOpacity);

        // select series on chart
        visEl.selectAll(liClass).style('opacity', self._attr.focusOpacity);
      })
      .on('mouseout', function () {
        /*
         * The default opacity of elements in charts may be modified by the
         * chart constructor, and so may differ from that of the legend
         */
        visEl.selectAll('.chart')
        .selectAll('.color')
        .style('opacity', self._attr.defaultOpacity);

        // Legend values should always return to their default opacity of 1
        visEl.select('.legend-ul')
        .selectAll('.color')
        .style('opacity', self._attr.legendDefaultOpacity);
      });
    };

    return Legend;
  };
});
