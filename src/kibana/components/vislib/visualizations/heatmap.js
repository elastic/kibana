define(function (require) {
  return function HeatMapFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var XAxis = Private(require('components/vislib/lib/x_axis'));
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
      this._attr = _.defaults(handler._attr || {});
      this._attr.margin = {
        top: 5,
        right: 5,
        bottom: 16,
        left: 40
      };
    }

    HeatMap.prototype.addRowLabels = function (svg, data, gridWidth, gridHeight, margin) {
      var self = this;
      var halfLabelHeight = 3;
      var rowLeftOffset = -3;
      var minGridLabelHeight = 9;
      var padding = 3;
      var formatter = data.rowFormatter;

      if (gridHeight >= minGridLabelHeight) {
        var rowLabels = svg.selectAll('.rowLabel')
        .data(data.series)
        .enter()
        .append('text')
        .text(function (d) {
          return formatter ? formatter(d.label) : d.label;
        })
        .attr('x', 0)
        .attr('y', function (d, i) { return i * gridHeight; })
        .style('text-anchor', 'end')
        .attr('transform', 'translate(' + rowLeftOffset + ',' + ((gridHeight * 0.5) + halfLabelHeight) + ')')
        .attr('class', function (d) {
          return 'heat-axis-label ' + d.label;
        });

        rowLabels.attr('transform', 'translate(-3,' + ((gridHeight * 0.5) + halfLabelHeight) + ')');
        if (self.maxTextLength(rowLabels) + padding <= margin.left) {
          return rowLabels.text(function (d) {
            return d.label;
          });
        }
        return rowLabels.text(function (d) {
          return null;
        });
      }
    };

    HeatMap.prototype.addColLabels = function (svg, data, gridWidth, gridHeight, height, margin) {
      var self = this;
      var colTopOffset = -10;
      var minGridLabelWidth = 9;
      var padding = 3;
      var formatter = data.columnFormatter;

      if (gridWidth >= minGridLabelWidth) {
        var colLabels = svg.selectAll('.colLabel')
        .data(data.series[0].values)
        .enter()
        .append('text')
        .text(function (d) {
          return formatter ? formatter(d.x) : d.x;
        })
        .attr('x', function (d, i) { return i * gridWidth; })
        .attr('y', height + margin.top + margin.bottom)
        .style('text-anchor', 'middle')
        .attr('transform', 'translate(' + (gridWidth * 0.5) + ',' + colTopOffset + ')')
        .attr('class', function (d) {
          return 'heat-axis-label ' + d.x;
        });
        if (self.maxTextLength(colLabels) + padding <= gridWidth) {
          return colLabels.text(function (d) {
            return formatter ? formatter(d.x) : d.x;
          });
        }
        return colLabels.text(function (d) {
          return null;
        });
      }
    };

    HeatMap.prototype.maxTextLength = function (selection) {
      var lengths = [];
      selection.each(function textWidths() {
        var length = Math.ceil(d3.select(this).node().getBBox().width);
        lengths.push(length);
      });
      var maxLength = _.max(lengths);
      return maxLength;
    };

    HeatMap.prototype.dataColor = function (d) {
      var self = this;
      if (d.x === '_all' && d.row === '_all') {
        return self.handler._attr.colors[3];
      }
      if (d.y !== 0) {
        if (self.handler._attr.colorScaleType === 'quantize') {
          return self.handler._attr.colorScale(d.y);
        } else {
          return self._attr.colors[self.handler._attr.colorScale(d.y)];
        }
      }
      return self.handler._attr.zeroColor;
    };

    HeatMap.prototype.addRects = function (svg, data, gridWidth, gridHeight) {
      var self = this;
      // TODO: make gap and radius user configurable
      var gap = 1;
      var radius = 0;
      var minWidth = 2;
      var cellWidth = gridWidth - gap;
      var cellHeight = gridHeight - gap;
      var layer;
      var heatMap;

      if (cellWidth < minWidth) {
        throw new errors.ContainerTooSmall();
      }

      layer = svg.selectAll('.layer')
      .data(data.series)
      .enter()
      .append('g')
      .attr('class', function (d) {
        return d.label;
      });

      heatMap = layer.selectAll('.heat')
      .data(function (d, i) {
        d.values.forEach(function (obj) {
          obj.rowIndex = i;
          obj.rowLabel = d.label ? d.label : '_all';
        });
        return d.values;
      });

      heatMap
      .exit()
      .remove();

      heatMap
      .enter()
      .append('rect')
      .attr('x', function (d, i) { return 1 + i * gridWidth; })
      .attr('y', function (d) { return (d.rowIndex) * gridHeight; })
      .attr('rx', radius)
      .attr('ry', radius)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .style('fill', function (d) {
        return self.dataColor(d);
      })
      .attr('class', function (d) {
        return 'rect bordered ' + self.colorToClass(self.dataColor(d));
      });

      return heatMap;
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
      var tooltip = this.tooltip;
      var isTooltip = this._attr.addTooltip;
      var minWidth = 40;
      var minHeight = 40;

      return function (selection) {

        // hide y axis line
        d3.select('path.domain').attr('class', 'hidden');

        selection.each(function (data) {
          var width = elWidth - margin.left - margin.right;
          var height = elHeight - margin.top - margin.bottom;
          var widthN = data.series[0].values.length;
          var heightN = data.series.length;

          var gridWidth = width / widthN;
          var gridHeight = height / heightN;

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          var div = d3.select(this);

          var svg = div.append('svg')
          .attr('width', elWidth)
          .attr('height', elHeight)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          var heatMap = self.addRects(svg, data, gridWidth, gridHeight);

          var rowLabels = self.addRowLabels(svg, data, gridWidth, gridHeight, margin);
          var colLabels = self.addColLabels(svg, data, gridWidth, gridHeight, height, margin);

          if (isTooltip) {
            heatMap.call(tooltip.render());
          }

          return svg;

        });
      };
    };

    return HeatMap;
  };
});
