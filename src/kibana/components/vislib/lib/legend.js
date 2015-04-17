define(function (require) {
  return function LegendFactory(d3, Private) {
    var _ = require('lodash');
    var Dispatch = Private(require('components/vislib/lib/dispatch'));
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
    function Legend(vis, data) {
      if (!(this instanceof Legend)) {
        return new Legend(vis, data);
      }

      var isPie = (vis._attr.type === 'pie');

      this.vis = vis;
      this.data = isPie ? this._transformPieData(data.pieData()) : this._transformSeriesData(data.getVisData());
      this.el = vis.el;
      this.events = new Dispatch();
      this.labels = isPie ? data.pieNames() : data.labels;
      this.color = isPie ? data.getPieColorFunc() : data.color;
      this._attr = _.defaults(vis._attr || {}, {
        'legendClass' : 'legend-col-wrapper',
        'blurredOpacity' : 0.3,
        'focusOpacity' : 1,
        'defaultOpacity' : 1,
        'legendDefaultOpacity': 1,
        'isOpen' : true
      });
    }

    Legend.prototype._transformPieData = function (arr) {
      var data = [];


      arr.forEach(function (chart) {
        chart.slices.children.forEach(function (obj) {
          if (obj.children) data.push(obj.children);
          data.push(obj);
        });
      });

      return data;
    };

    Legend.prototype._transformSeriesData = function (arr) {
      var data = [];

      arr.forEach(function (chart) {
        chart.series.forEach(function (obj, i) {
          var currentObj = data[i];
          if (!currentObj) data.push(obj);

          if (currentObj && currentObj.label === obj.label) {
            currentObj.values = currentObj.values.concat(obj.values);
          }
        });
      });

      return data;
    };

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
        .attr('class', 'color')
        .each(self._addIdentifier)
        .html(function (d) {
          return '<i class="fa fa-circle dots" style="color:' + args.color(d) + '"></i>' + d;
        });
    };

    /**
     * Append the data label to the element
     *
     * @method _addIdentifier
     * @param label {string} label to use
     */
    Legend.prototype._addIdentifier = function (label) {
      dataLabel(this, label);
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

      legendDiv.select('.legend-ul').selectAll('li')
      .on('mouseover', function (label) {
        var charts = visEl.selectAll('.chart');

        // legend
        legendDiv.selectAll('li')
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
        legendDiv.selectAll('li')
        .classed('blur_shape', false);

        // all data-label attribute
        charts.selectAll('[data-label]')
        .classed('blur_shape', false);

        var eventEl =  d3.select(this);
        eventEl.style('white-space', 'nowrap');
        eventEl.style('word-break', 'inherit');
      });

      legendDiv.call(this.events.addClickEvent());
    };

    return Legend;
  };
});
