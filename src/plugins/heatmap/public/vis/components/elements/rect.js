import d3 from 'd3';
import _ from 'lodash';

function rect() {
  var color = d3.scale.category10();
  var x = function (d) { return d.x; };
  var y = function (d) { return d.y; };
  var rx = function (d) { return d.rx || 0; };
  var ry = function (d) { return d.ry || 0; };
  var width = function (d) { return d.width; };
  var height = function (d) { return d.height; };
  var cssClass = 'cell';
  var fill = colorFill;
  var stroke = colorFill;
  var strokeWidth = 0;
  var fillOpacity = 1;
  var strokeOpacity;

  function element(selection) {
    selection.each(function (data) {
      var cells = d3.select(this).selectAll('rect.' + cssClass)
        .data(data);

      cells.exit().remove();

      cells.enter().append('rect')
        .attr('class', cssClass);

      cells
        .attr('x', x)
        .attr('y', y)
        .attr('rx', rx)
        .attr('ry', ry)
        .attr('width', width)
        .attr('height', height)
        .style('fill', fill)
        .style('fill-opacity', fillOpacity)
        .style('stroke', stroke)
        .style('stroke-width', strokeWidth)
        .style('stroke-opacity', strokeOpacity);
    });
  }

  function colorFill(d, i) {
    return color(i);
  }

  // Public API
  element.x = function (v) {
    if (!arguments.length) return x;
    x = d3.functor(v);
    return element;
  };

  element.y = function (v) {
    if (!arguments.length) return y;
    y = d3.functor(v);
    return element;
  };

  element.rx = function (v) {
    if (!arguments.length) return rx;
    rx = d3.functor(v);
    return element;
  };

  element.ry = function (v) {
    if (!arguments.length) return ry;
    ry = d3.functor(v);
    return element;
  };

  element.width = function (v) {
    if (!arguments.length) return width;
    width = d3.functor(v);
    return element;
  };

  element.height = function (v) {
    if (!arguments.length) return height;
    height = d3.functor(v);
    return element;
  };

  element.class = function (v) {
    if (!arguments.length) return cssClass;
    cssClass = _.isString(v) ? v : cssClass;
    return element;
  };

  element.fill = function (v) {
    if (!arguments.length) return fill;
    fill = v;
    return element;
  };

  element.fillOpacity = function (v) {
    if (!arguments.length) return fillOpacity;
    fillOpacity = v;
    return element;
  };

  element.stroke = function (v) {
    if (!arguments.length) return stroke;
    stroke = v;
    return element;
  };

  element.strokeWidth = function (v) {
    if (!arguments.length) return strokeWidth;
    strokeWidth = v;
    return element;
  };

  element.strokeOpacity = function (v) {
    if (!arguments.length) return strokeOpacity;
    strokeOpacity = v;
    return element;
  };

  return element;
};

export default rect;
