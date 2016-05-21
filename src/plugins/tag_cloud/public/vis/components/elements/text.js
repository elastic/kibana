import d3 from 'd3';
import _ from 'lodash';
import valuator from 'plugins/tagcloud/vis/components/utils/valuator';

function textGenerator() {
  var colorScale = d3.scale.category20();
  var cssClass = 'tag';
  var transform = function (d) {
    return 'translate(' + [d.x, d.y] + ')rotate(' + d.rotate + ')';
  };
  var fontSize = function (d) { return d.size + 'px'; };
  var fontFamily = function (d) { return d.font; };
  var fontWeight = function (d) { return d.weight; };
  var fontStyle = function (d) { return d.style; };
  var fill = function (d, i) { return colorScale(i); };
  var fillOpacity = d3.functor(1);
  var textAnchor = d3.functor('middle');
  var textAccessor = function (d) { return d.text; };

  function generator(selection) {
    selection.each(function (data, index) {
      var text = d3.select(this).selectAll('text.' + cssClass)
        .data(data);

      text.exit().remove();

      text.enter().append('text')
        .attr('class', cssClass);

      text
        .attr('transform', transform)
        .attr('text-anchor', textAnchor)
        .style('fill', fill)
        .style('fill-opacity', fillOpacity)
        .style('font-size', fontSize)
        .style('font-family', fontFamily)
        .style('font-weight', fontWeight)
        .style('font-style', fontStyle)
        .text(textAccessor);
    });
  }

  // Public API
  generator.cssClass = function (v) {
    if (!arguments.length) { return cssClass; }
    cssClass = _.isString(v) ? v : cssClass;
    return generator;
  };

  generator.transform = function (v) {
    if (!arguments.length) { return transform; }
    transform = d3.functor(v);
    return generator;
  };

  generator.fill = function (v) {
    if (!arguments.length) { return fill; }
    fill = d3.functor(v);
    return generator;
  };

  generator.fillOpacity = function (v) {
    if (!arguments.length) { return fillOpacity; }
    fillOpacity = d3.functor(v);
    return generator;
  };

  generator.fontFamily = function (v) {
    if (!arguments.length) { return fontFamily; }
    fontFamily = d3.functor(v);
    return generator;
  };

  generator.fontSize = function (v) {
    if (!arguments.length) { return fontSize; }
    fontSize = d3.functor(v);
    return generator;
  };

  generator.fontStyle = function (v) {
    if (!arguments.length) { return fontStyle; }
    fontStyle = d3.functor(v);
    return generator;
  };

  generator.fontWeight = function (v) {
    if (!arguments.length) { return fontWeight; }
    fontSize = d3.functor(v);
    return generator;
  };
  generator.textAnchor = function (v) {
    if (!arguments.length) { return textAnchor; }
    textAnchor = d3.functor(v);
    return generator;
  };

  generator.text = function (v) {
    if (!arguments.length) { return textAccessor; }
    textAccessor = valuator(v);
    return generator;
  };

  return generator;
}

export default textGenerator;
