define(function (require) {
  return function PieChartFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/visualizations/_chart'));

    // Dynamically adds css file
    require('css!components/vislib/components/styles/main');

    /*
     * Column chart visualization => vertical bars, stacked bars
     */
    _(PieChart).inherits(Chart);
    function PieChart(vis, chartEl, chartData) {
      if (!(this instanceof PieChart)) {
        return new PieChart(vis, chartEl, chartData);
      }

      PieChart.Super.apply(this, arguments);

      this._attr = _.defaults(vis._attr || {}, {
        yValue: function (d) { return d.y; },
        dispatch: d3.dispatch('brush', 'click', 'hover', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout')
      });
    }

    PieChart.prototype.eventResponse = function (d, i) {
      return {
        value     : this._attr.yValue(d, i),
        point     : d,
        label     : d.label,
        color     : this.vis.data.getColorFunc()(d.label),
        pointIndex: i,
        series    : this.chartData.series,
        config    : this._attr,
        data      : this.chartData,
        e         : d3.event
      };
    };

    PieChart.prototype.addPathEvents = function (path) {
      var self = this;
      var tooltip = this.vis.tooltip;
      var isTooltip = this._attr.addTooltip;
      var dispatch = this._attr.dispatch;

      path
        .on('mouseover.pie', function (d, i) {
          d3.select(this)
            .classed('hover', true)
            .style('cursor', 'pointer');

          dispatch.hover(self.eventResponse(d, i));
          d3.event.stopPropagation();
        })
        .on('click.pie', function (d, i) {
          dispatch.click(self.eventResponse(d, i));
          d3.event.stopPropagation();
        })
        .on('mouseout.pie', function () {
          d3.select(this).classed('hover', false)
            .style('stroke', null);
        });

      // Add tooltip
      if (isTooltip) {
        path.call(tooltip.render());
      }
    };

    PieChart.prototype.draw = function () {
      var self = this;

      return function (selection) {
        selection.each(function (data) {

          var div = d3.select(this);
          var width = $(this).width();
          var height = $(this).height();
          var radius = Math.min(width, height) / 2;
          var color = self.vis.data.getPieColorFunc();

          var svg = div.append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

          var partition = d3.layout.partition()
            .sort(null)
            .size([2 * Math.PI, radius * radius])
            .value(function (d) {
              return d.size;
            });

          var arc = d3.svg.arc()
            .startAngle(function (d) {
              return d.x;
            })
            .endAngle(function (d) {
              return d.x + d.dx;
            })
            .innerRadius(function (d) {
              if (d.depth === 1) {
                return 0;
              }
              return Math.sqrt(d.y);
            })
            .outerRadius(function (d) {
              return Math.sqrt(d.y + d.dy);
            });

          var path = svg.datum(data.root).selectAll('path')
            .data(partition.nodes)
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('class', function (d) {
              if (d.depth === 0) { return; }
              return self.colorToClass(color(d.name));
            })
            .style('stroke', '#fff')
            .style('fill', function (d) {
              return color(d.name);
            });

          // add events to bars
          self.addPathEvents(path);

          return svg;
        });
      };
    };

    return PieChart;
  };
});