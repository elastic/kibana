var d3 = require('d3');

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
  element.x = function (_) {
    if (!arguments.length) return x;
    x = d3.functor(_);
    return element;
  };

  element.y = function (_) {
    if (!arguments.length) return y;
    y = d3.functor(_);
    return element;
  };

  element.rx = function (_) {
    if (!arguments.length) return rx;
    rx = d3.functor(_);
    return element;
  };

  element.ry = function (_) {
    if (!arguments.length) return ry;
    ry = d3.functor(_);
    return element;
  };

  element.width = function (_) {
    if (!arguments.length) return width;
    width = d3.functor(_);
    return element;
  };

  element.height = function (_) {
    if (!arguments.length) return height;
    height = d3.functor(_);
    return element;
  };

  element.class= function (_) {
    if (!arguments.length) return cssClass;
    cssClass = _;
    return element;
  };

  element.fill = function (_) {
    if (!arguments.length) return fill;
    fill = _;
    return element;
  };

  element.fillOpacity = function (_) {
    if (!arguments.length) return fillOpacity;
    fillOpacity = _;
    return element;
  };

  element.stroke = function (_) {
    if (!arguments.length) return stroke;
    stroke = _;
    return element;
  };

  element.strokeWidth = function (_) {
    if (!arguments.length) return strokeWidth;
    strokeWidth = _;
    return element;
  };

  element.strokeOpacity = function (_) {
    if (!arguments.length) return strokeOpacity;
    strokeOpacity = _;
    return element;
  };

  return element;
};

module.exports = rect;
