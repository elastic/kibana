var d3 = require('d3');

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
  element.x = function (_) {
    if (!arguments.length) { return x; }
    x = d3.functor(_);
    return element;
  };

  element.y = function (_) {
    if (!arguments.length) { return y; }
    y = d3.functor(_);
    return element;
  };

  element.dx = function (_) {
    if (!arguments.length) { return dx; }
    dx = d3.functor(_);
    return element;
  };

  element.dy = function (_) {
    if (!arguments.length) { return dy; }
    dy = d3.functor(_);
    return element;
  };

  element.transform = function (_) {
    if (!arguments.length) { return transform; }
    transform = _;
    return element;
  };

  element.class= function (_) {
    if (!arguments.length) { return cssClass; }
    cssClass = _;
    return element;
  };

  element.anchor = function (_) {
    if (!arguments.length) { return anchor; }
    anchor = _;
    return element;
  };

  element.fill = function (_) {
    if (!arguments.length) { return fill; }
    fill = _;
    return element;
  };

  element.text = function (_) {
    if (!arguments.length) { return texts; }
    texts = _;
    return element;
  };

  return element;
};

module.exports = text;
