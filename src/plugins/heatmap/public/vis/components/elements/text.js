import d3 from 'd3';
import _ from 'lodash';

function text() {
  var x = function (d) { return d.x || 0; };
  var y = function (d) { return d.y || 0; };
  var dx = function (d) { return d.dx || ''; };
  var dy = function (d) { return d.dy || ''; };
  var transform = null;
  var cssClass = 'text';
  var fill = '#ffffff';
  var anchor = 'middle';
  var texts = '';

  function element(selection) {
    selection.each(function (data) {
      var text = d3.select(this).selectAll('text.' + cssClass)
        .data(data);

      text.exit().remove();

      text.enter().append('text')
        .attr('class', cssClass);

      text
        .attr('transform', transform)
        .attr('x', x)
        .attr('y', y)
        .attr('dx', dx)
        .attr('dy', dy)
        .style('fill', fill)
        .style('text-anchor', anchor)
        .text(texts);
    });
  }

  // Public API
  element.x = function (v) {
    if (!arguments.length) { return x; }
    x = d3.functor(v);
    return element;
  };

  element.y = function (v) {
    if (!arguments.length) { return y; }
    y = d3.functor(v);
    return element;
  };

  element.dx = function (v) {
    if (!arguments.length) { return dx; }
    dx = d3.functor(v);
    return element;
  };

  element.dy = function (v) {
    if (!arguments.length) { return dy; }
    dy = d3.functor(v);
    return element;
  };

  element.transform = function (v) {
    if (!arguments.length) { return transform; }
    transform = v;
    return element;
  };

  element.class = function (v) {
    if (!arguments.length) { return cssClass; }
    cssClass = _.isString(v) ? v : cssClass;
    return element;
  };

  element.anchor = function (v) {
    if (!arguments.length) { return anchor; }
    anchor = v;
    return element;
  };

  element.fill = function (v) {
    if (!arguments.length) { return fill; }
    fill = v;
    return element;
  };

  element.text = function (v) {
    if (!arguments.length) { return texts; }
    texts = v;
    return element;
  };

  return element;
};

export default text;
