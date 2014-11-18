define(function (require) {
  return function HeatMapFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');
    require('css!components/vislib/styles/main');

    /**
     * HeatMap Visualization: renders arrays of rectangles to display dense data
     *
     * @class HeatMap
     * @constructor
     * @extends Chart
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific chart
     */
    _(HeatMap).inherits(Chart);
    function HeatMap(handler, chartEl, chartData) {
      if (!(this instanceof HeatMap)) {
        return new HeatMap(handler, chartEl, chartData);
      }

      HeatMap.Super.apply(this, arguments);

      // HeatMap specific attributes
      this._attr = _.defaults(handler._attr || {}, {
        xValue: function (d) { return d.x; },
        yValue: function (d) { return d.y; }
      });
    }

    /**
     * Stacks chart data values
     *
     * @method stackData
     * @param data {Object} Elasticsearch query result for this chart
     * @returns {Array} Stacked data objects with x, y, and y0 values
     */
    HeatMap.prototype.stackData = function (data) {
      var self = this;

      return this._attr.stack(data.series.map(function (d) {
        var label = d.label;
        return d.values;
        //return d.values.map(function (e, i) {
        //  return {
        //    label: label,
        //    x: self._attr.xValue.call(d.values, e, i),
        //    y: self._attr.yValue.call(d.values, e, i)
        //  };
        //});
      }));
    };

    /**
     * Adds SVG rects to HeatMap
     *
     * @method addRects
     * @param svg {HTMLElement} SVG to which rect are appended
     * @param layers {Array} Chart data array
     * @returns {D3.UpdateSelection} SVG with rect added
     */
    HeatMap.prototype.addRects = function (svg, layers) {
      var self = this;
      var color = this.handler.data.getColorFunc();
      var tooltip = this.tooltip;
      var isTooltip = this._attr.addTooltip;
      var layer;
      var rects;

      layer = svg.selectAll('.layer')
      .data(layers)
      .enter().append('g')
      .attr('class', function (d, i) {
        return i;
      });

      rects = layer.selectAll('rect')
      .data(function (d) {
        return d;
      });

      rects
      .exit()
      .remove();

      rects
      .enter()
      .append('rect')
      .attr('class', function (d) {
        return self.colorToClass(color(d.label));
      })
      .attr('fill', function (d) {
        return color(d.label);
      });

      self.updateRects(rects);

      // Add tooltip
      if (isTooltip) {
        rects.call(tooltip.render());
      }

      return rects;
    };

    /**
     * Adds stacked bars to column chart visualization
     *
     * @method addStackedBars
     * @param bars {D3.UpdateSelection} SVG with rect added
     * @returns {D3.UpdateSelection}
     */
    HeatMap.prototype.updateRects = function (rects) {

      var self = this;
      var data = this.chartData;

      var gridSize = 13;
      var cellPadding = 1;
      var cellSize = gridSize - cellPadding;
      var cornerRadius = 0;
      var width = this._attr.width;
      var height = this._attr.height;
      var margin = { top: 10, right: 20, bottom: 20, left: 25 };

      var hourFormat = d3.time.format('%H');
      var dayFormat = d3.time.format('%j');
      var timeFormat = d3.time.format('%Y-%m-%dT%X');
      var monthDayFormat = d3.time.format('%m.%d');

      var dateExtent = null;
      var chartData = [];


      var xExtents = d3.extent(data.series[0].values, function (d) {
        return d.x;
      });
      var yExtents = d3.extent(data.series[0].values, function (d) {
        return d.y;
      });
      // console.log(xExtents);
      // console.log(yExtents);

      var col;
      var row;
      var rowMax = 8;

      function gridCoords(i) {
        // reset coords
        if (i === 0) {
          col = 0;
          row = 0;
        }
        if (row >= rowMax) {
          col++;
          row = 0;
        }
        var grid = {
          x: col,
          y: row
        };
        row++;
        return grid;
      }

      // update
      rects
      .attr('width', function () {
        return cellSize;
      })
      .attr('height', function () {
        return cellSize;
      })
      .attr('x', function (d, i) {
        return gridSize * gridCoords(i).x;
      })
      .attr('y', function (d, i) {
        return gridSize * gridCoords(i).y;
      })
      .attr('fill', function (d) {
        return self.gridColor(d, yExtents);
      });
      return rects;
    };

    HeatMap.prototype.gridColor = function (d, extents) {
      var colors = [
        '#fef0d9',
        '#fdd49e',
        '#fdbb84',
        '#fc8d59',
        '#e34a33',
        '#b30000'
      ];
      var colorIndex = d3.scale.quantize()
        .range([0, 1, 2, 3, 4, 5])
        .domain(extents);
      return colors[colorIndex(d.y)];
    };

    /**
     * Renders heatmap chart
     *
     * @method draw
     * @param selection
     * @return {Function} Creates the heatmap
     */
    HeatMap.prototype.draw = function () {
      var self = this;
      var $elem = $(this.chartEl);
      var margin = this._attr.margin;
      var elWidth = this._attr.width = $elem.width();
      var elHeight = this._attr.height = $elem.height();
      var minWidth = 60;
      var minHeight = 60;
      var div;
      var svg;
      var width;
      var height;
      var layers;
      var heatmap;

      return function (selection) {
        selection.each(function (data) {
          layers = self.stackData(data);

          width = elWidth;
          height = elHeight - margin.top - margin.bottom;

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          div = d3.select(this);

          svg = div.append('svg')
          .attr('width', width)
          .attr('height', height + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(0,' + margin.top + ')');

          heatmap = self.addRects(svg, layers);

          // Adds event listeners
          //self.addEvents(rects, svg);

          return svg;
        });
      };
    };

    return HeatMap;
  };
});
