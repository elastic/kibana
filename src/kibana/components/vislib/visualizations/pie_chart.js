define(function (require) {
  return function PieChartFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');

    // Dynamically adds css file
    require('css!components/vislib/styles/main');

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
        getSize: function (d) { return d.size; },
        dispatch: d3.dispatch('brush', 'click', 'hover', 'mouseenter', 'mouseleave', 'mouseover', 'mouseout')
      });
    }

    PieChart.prototype.addPathEvents = function (path) {
      var events = this.events;
      var dispatch = this.events._attr.dispatch;

      path
      .on('mouseover.pie', function mouseOverPie(d, i) {
        d3.select(this)
        .classed('hover', true)
        .style('cursor', 'pointer');

        dispatch.hover(events.eventResponse(d, i));
        d3.event.stopPropagation();
      })
      .on('click.pie', function clickPie(d, i) {
        dispatch.click(events.eventResponse(d, i));
        d3.event.stopPropagation();
      })
      .on('mouseout.pie', function mouseOutPie() {
        d3.select(this)
        .classed('hover', false);
      });
    };

    PieChart.prototype.addPath = function (width, height, svg, slices) {
      var isDonut = this._attr.isDonut;
      var radius = Math.min(width, height) / 2;
      var color = this.vis.data.getPieColorFunc();
      var partition = d3.layout.partition()
      .sort(null)
      .value(function (d) {
        return d.size;
      });
      var x = d3.scale.linear()
      .range([0, 2 * Math.PI]);
      var y = d3.scale.sqrt()
      .range([0, radius]);
      var arc = d3.svg.arc()
      .startAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
      })
      .endAngle(function (d) {
        return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
      })
      .innerRadius(function (d) {
        // option for a single layer, i.e pie chart
        if (d.depth === 1 && !isDonut) {
          // return no inner radius
          return 0;
        }

        return Math.max(0, y(d.y));
      })
      .outerRadius(function (d) {
        return Math.max(0, y(d.y + d.dy));
      });
      var tooltip = this.vis.tooltip;
      var isTooltip = this._attr.addTooltip;
      var self = this;
      var path;

      path = svg
      .datum(slices)
      .selectAll('path')
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
          if (d.depth === 0) { return 'none'; }
          return color(d.name);
        })
        .attr('fill-rule', 'evenodd');

      // Add tooltip
      if (isTooltip) {
        path.call(tooltip.render());
      }

      return path;
    };

    PieChart.prototype.draw = function () {
      var self = this;
      var isEvents = this._attr.addEvents;

      return function (selection) {
        selection.each(function (data) {
          var slices = data.slices;
          var el = this;
          var div = d3.select(el);
          var width = $(el).width();
          var height = $(el).height();
          var minWidth = 20;
          var minHeight = 20;

          if (width <= minWidth || height <= minHeight) {
            throw new errors.ContainerTooSmall();
          }

          var svg = div.append('svg')
          .attr('width', width)
          .attr('height', height)
          .append('g')
          .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

          // add pie slices
          var path = self.addPath(width, height, svg, slices);

          // add events to bars
          if (isEvents) {
            self.addPathEvents(path);
          }

          return svg;
        });
      };
    };

    return PieChart;
  };
});