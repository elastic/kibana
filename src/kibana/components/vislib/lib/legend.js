define(function (require) {
  return function LegendFactory(d3) {
    var _ = require('lodash');
    var legendHeaderTemplate = _.template(require('text!components/vislib/partials/legend_header.html'));
    var dataLabel = require('components/vislib/lib/_data_label');

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
      if (!_.isPlainObject(_.first(this.labels))) {
        this.labels = _.map(this.labels, function (label) {
          return {name: label, children: []};
        });
      }
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

      function recurseLabels(li) {
        li.attr('class', 'color');
        var label = li.append('div')
          .attr('class', 'color')
          .each(self._addIdentifier);

        label.append('i')
          .attr('class', 'fa fa-circle dots')
          .attr('style', function (d) {
            return 'color:' + args.color(d.name);
          });

        label.append('span')
        .text(function (d) {
          return d.name;
        });

        var hasChildSelection = li.filter(function (d) {
          return d.children.length > 0;
        });
        if (hasChildSelection.empty()) {
          return;
        }

        // add children
        hasChildSelection.append('ul')
        .selectAll('li')
        .data(function (d) {
          return d.children;
        })
        .enter()
          .append('li')
          .call(recurseLabels);
      }

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
        .call(recurseLabels);
    };

    /**
     * Append the data label to the element
     *
     * @method _addIdentifier
     * @param label {string} label to use
     */
    Legend.prototype._addIdentifier = function (label) {
      dataLabel(this, label.name);
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

      legendDiv.select('.legend-ul').selectAll('li > div')
      .on('mouseover', function (d) {
        // data-label's are strings so make sure the label is a string
        var label = '' + d.name;
        var charts = visEl.selectAll('.chart');

        // legend
        legendDiv.selectAll('li div.color')
        .filter(function (d) {
          return this.getAttribute('data-label') !== label;
        })
        .classed('blur_shape', true);

        // all data-label attribute
        charts.selectAll('[data-label]')
        .filter(function (d) {
          return this.getAttribute('data-label') !== label;
        })
        .classed('blur_shape', true);

        var eventEl =  d3.select(this);
        eventEl.style('white-space', 'inherit');
        eventEl.style('word-break', 'break-all');
      })
      .on('mouseout', function () {
        /*
         * The default opacity of elements in charts may be modified by the
         * chart constructor, and so may differ from that of the legend
         */

        var charts = visEl.selectAll('.chart');

        // legend
        legendDiv.selectAll('li div.blur_shape')
        .classed('blur_shape', false);

        // all blur'ed elements with data-label attribute
        charts.selectAll('.blur_shape[data-label]')
        .classed('blur_shape', false);

        var eventEl =  d3.select(this);
        eventEl.style('white-space', 'nowrap');
        eventEl.style('word-break', 'inherit');
      });
    };

    return Legend;
  };
});
