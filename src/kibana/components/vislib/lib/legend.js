define(function (require) {
  return function LegendFactory(d3, Private) {
    var _ = require('lodash');
    var Dispatch = Private(require('components/vislib/lib/dispatch'));
    var legendHeaderTemplate = _.template(require('text!components/vislib/partials/legend_header.html'));
    var dataLabel = require('components/vislib/lib/_data_label');
    var AggConfigResult = require('components/vis/_agg_config_result');
    var getLabels = Private(require('components/vislib/components/labels/labels'));

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
    function Legend(vis, data, color) {
      if (!(this instanceof Legend)) {
        return new Legend(vis, data, color);
      }

      this.events = new Dispatch();
      this.vis = vis;
      this.el = vis.el;
      this.data = this._getData(data);
      this.labels = this._getLabels(data, vis._attr.type);
      this.color = color;

      this._attr = _.defaults(vis._attr || {}, {
        'legendClass' : 'legend-col-wrapper',
        'blurredOpacity' : 0.3,
        'focusOpacity' : 1,
        'defaultOpacity' : 1,
        'legendDefaultOpacity': 1,
        'isOpen' : true
      });
    }

    Legend.prototype._getLabels = function (data, type) {
      if (data.series && data.series.length === 1 && getLabels(data)[0] === '') {
        return [data.yAxisLabel];
      }
      return getLabels(data, type);
    };

    Legend.prototype._getData = function (data) {
      return data.columns || data.rows || [data];
    };

    Legend.prototype._filter = function (item) {
      if (item !== undefined) return item;
    };

    Legend.prototype._reduce = function (a, b) {
      return a.concat(b);
    };

    Legend.prototype._value = function (d) {
      return d;
    };

    /**
     * Filter out zero injected objects
     */
    Legend.prototype._filterZeroInjectedValues = function (d) {
      return (d.aggConfigResult !== undefined);
    };

    Legend.prototype._modifyPointSeriesLabels = function (data, labels) {
      return labels.map(function (label) {
        var values = [];
        var prevAggConfigResult;
        var aggConfigResult;

        data.forEach(function (datum) {
          datum.series.forEach(function (d) {
            if (d.label === label) {
              d.values.forEach(function (e) {
                if (e.aggConfigResult) {
                  values.push(e);
                }
              });
            }
          });
        });

        if (values.length && values[0].aggConfigResult) {
          prevAggConfigResult = values[0].aggConfigResult.$parent;
          aggConfigResult = new AggConfigResult(prevAggConfigResult.aggConfig, null,
            prevAggConfigResult.value, prevAggConfigResult.key);
        }

        return {
          label: label,
          aggConfigResult: aggConfigResult,
          values: values
        };
      });
    };

    /**
     * Returns an arr of data objects that includes labels, aggConfig, and an array of data values
     * for the pie chart.
     */
    Legend.prototype._modifyPieLabels = function (data, labels) {
      return labels.map(function (label) {
        var values = [];
        var aggConfigResult;

        data.forEach(function (datum) {
          datum.slices.children.forEach(function traverse(d) {
            if (d.children) d.children.forEach(traverse);
            if (d.name === label) values.push(d);
          });
        });

        if (values.length && values[0].aggConfigResult) {
          aggConfigResult = values[0].aggConfigResult;
          if (aggConfigResult.$parent) aggConfigResult.$parent = undefined;
        }

        return {
          label: label,
          aggConfigResult: aggConfigResult,
          values: values
        };
      });
    };

    Legend.prototype._getDataLabels = function (data, type, labels) {
      if (type === 'pie') return this._modifyPieLabels(data, labels);
      return this._modifyPointSeriesLabels(data, labels);
    };

    /**
     * Adds legend header
     *
     * @method header
     * @param el {HTMLElement} Reference to DOM element
     * @param args {Object|*} Legend options
     * @returns {*} HTML element
     */
    Legend.prototype._header = function (el, args) {
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
    Legend.prototype._list = function (el, arrOfLabels, args) {
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
      var items = this._getDataLabels(this.data, this._attr.type, this.labels);
      this._header(legendDiv, this);
      this._list(legendDiv, items, this);

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

        function filterLabel() {
          var pointLabel = this.getAttribute('data-label');
          return pointLabel !== label.toString();
        }

        if (label && label !== '_all') {
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
