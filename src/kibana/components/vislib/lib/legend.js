define(function (require) {
  return function LegendFactory(d3, Private) {
    var _ = require('lodash');
    var Dispatch = Private(require('components/vislib/lib/dispatch'));
    var legendHeaderTemplate = _.template(require('text!components/vislib/partials/legend_header.html'));
    var dataLabel = require('components/vislib/lib/_data_label');
    var AggConfigResult = require('components/vis/_agg_config_result');

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
      this.data = data;
      this.el = vis.el;
      this.dataLabels = isPie ? this._transformPieData(data.pieData()) : this._transformSeriesData(data.getVisData());
      this.events = new Dispatch();
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

    /**
     * Returns an arr of data objects that includes labels, aggConfig, and an array of data values
     * for the pie chart.
     */
    Legend.prototype._transformPieData = function (arr) {
      var data = [];
      var recurse = function (obj) {
        if (obj.children) {
          recurse(obj.children).reverse().forEach(function (d) { data.unshift(d); });
        }
        return obj;
      };

      arr.forEach(function (chart) {
        chart.slices.children.map(recurse)
        .reverse().forEach(function (d) { data.unshift(d); });
      });

      return _.unique(data, function (d) { return d.name; });
    };

    /**
     * Filter out zero injected objects
     */
    Legend.prototype._filterZeroInjectedValues = function (arr) {
      return arr.filter(function (d) {
        return d.aggConfigResult !== undefined;
      });
    };

    /**
     * Returns an arr of data objects that includes labels, aggConfig, and an array of data values
     * for the point series charts.
     */
    Legend.prototype._transformSeriesData = function (arr) {
      var data = [];
      var self = this;

      arr.forEach(function (chart) {
        chart.series.forEach(function (obj, i) {
          var currentObj = data[i];
          if (!currentObj) data.push(obj);

          // Copies first aggConfigResults object to data object.
          if (obj.values && obj.values.length) {
            var values = self._filterZeroInjectedValues(obj.values);
            var aggConfigResult = values[0].aggConfigResult;

            obj.aggConfigResult = new AggConfigResult(aggConfigResult.aggConfig, aggConfigResult.$parent,
              aggConfigResult.value, aggConfigResult.key);

            obj.aggConfigResult.$parent.$parent = null;
          }

          // Joins all values arrays that share a common label
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
        if (args._attr.isOpen) { return 'legend-ul'; }
        return 'legend-ul hidden';
      })
      .selectAll('li')
      .data(arrOfLabels)
      .enter()
        .append('li')
        .attr('class', 'color')
        .each(self._addIdentifier)
        .html(function (d, i) {
          var label = d.label ? d.label : d.name;
          if (!label) { label = self.data.get('yAxisLabel'); }
          return '<i class="fa fa-circle dots" style="color:' + args.color(label) + '"></i>' + label;
        });
    };

    /**
     * Append the data label to the element
     *
     * @method _addIdentifier
     * @param label {string} label to use
     */
    Legend.prototype._addIdentifier = function (d) {
      var label = d.label ? d.label : d.name;
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
      var items = this.dataLabels;
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
      .on('mouseover', function (d) {
        var label = d.label ? d.label : d.name;
        var charts = visEl.selectAll('.chart');

        function filterLabel(d) {
          var pointLabel = this.getAttribute('data-label');
          return pointLabel !== label;
        }

        if (label !== undefined && label !== '_all') {
          d3.select(this).style('cursor', 'pointer');
        }

        // legend
        legendDiv.selectAll('li')
        .filter(filterLabel)
        .classed('blur_shape', true);

        // all data-label attribute
        charts.selectAll('[data-label]')
        .filter(filterLabel)
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

      legendDiv.selectAll('li.color').each(function (d) {
        var label = d.label ? d.label : d.name;
        if (label !== undefined && label !== '_all') {
          d3.select(this).call(self.events.addClickEvent());
        }
      });
    };

    return Legend;
  };
});
