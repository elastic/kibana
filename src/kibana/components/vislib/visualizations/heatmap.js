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
    }

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
      var minGridLabelWidth = 9;
      var minGridLabelHeight = 9;
      var halfLabelHeight = 3;
      var rowLeftOffset = -3;
      var colTopOffset = -16;


      return function (selection) {

        // hide y axis line
        d3.select('path.domain').attr('class', 'hidden');

        selection.each(function (data) {
          var width = elWidth - margin.left - margin.right;
          var height = elHeight - margin.top - margin.bottom;
          var widthN = data.series[0].values.length;
          var heightN = data.series.length;

          // TODO: make gap and radius user configurable
          var gap = 1;
          var radius = 0;
          var gridWidth = width / widthN;
          var gridHeight = height / heightN;
          var cellWidth = gridWidth - gap;
          var cellHeight = gridHeight - gap;

          if (width < minWidth || height < minHeight) {
            throw new errors.ContainerTooSmall();
          }

          var div = d3.select(this);

          var svg = div.append('svg')
          .attr('width', elWidth)// + margin.left + margin.right)
          .attr('height', elHeight)// + margin.top + margin.bottom)
          .append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

          if (gridHeight >= minGridLabelHeight) {
            var rowLabels = svg.selectAll('.rowLabel')
            .data(data.series)
            .enter()
            .append('text')
            .text(function (d) { return d.label; })
            .attr('x', 0)
            .attr('y', function (d, i) { return i * gridHeight; })
            .style('text-anchor', 'end')
            .attr('transform', 'translate(' + rowLeftOffset + ',' + ((gridHeight * 0.5) + halfLabelHeight) + ')')
            .attr('class', function (d) {
              return 'heat-axis-label ' + d.label;
            });
          }

          if (gridWidth >= minGridLabelWidth) {
            var colLabels = svg.selectAll('.colLabel')
            .data(data.series[0].values)
            .enter()
            .append('text')
            .text(function (d) { return d.x; })
            .attr('x', function (d, i) { return i * gridWidth; })
            .attr('y', height + margin.top + margin.bottom)
            .style('text-anchor', 'middle')
            .attr('transform', 'translate(' + (gridWidth * 0.5) + ',' + colTopOffset + ')')
            .attr('class', function (d) {
              return 'heat-axis-label ' + d.x;
            });
          }

          var layer = svg.selectAll('.layer')
          .data(data.series)
          .enter()
          .append('g')
          .attr('class', function (d) {
            return d.label;
          });

          var heatMap = layer.selectAll('.heat')
          .data(function (d, i) {
            d.values.forEach(function (obj) {
              obj.labelIndex = i;
              obj.label = d.label;
            });
            return d.values;
          })
          .enter()
          .append('rect')
          .attr('x', function (d, i) { return 1 + i * gridWidth; })
          .attr('y', function (d) { return (d.labelIndex) * gridHeight; })
          .attr('rx', radius)
          .attr('ry', radius)
          .attr('class', 'rect bordered')
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .style('fill', function (d) {
            if (d.y !== 0) {
              if (self.handler._attr.colorScaleType === 'quantize') {
                return self.handler._attr.colorScale(d.y);
              } else {
                return self._attr.colors[self.handler._attr.colorScale(d.y)];
              }
            }
            return self.handler._attr.zeroColor;
          });

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
