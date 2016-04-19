var d3 = require('d3');
var _ = require('lodash');
var rotate = require('plugins/heatmap/vis/components/axis/rotate');

function axes() {
  var scale = d3.scale.linear();
  var orientation = 'left';
  var rotateLabels = false;
  var rotateOptions = {};
  var ticks = {};
  var title = {};
  var transform = 'translate(0,0)';
  var cssClass = 'axis';
  var axis = d3.svg.axis();
  var rotation = rotate();

  function generator(selection) {
    selection.each(function (data) {
      axis.orient(orientation)
        .scale(scale)
        .ticks(ticks.number || 10)
        .tickValues(ticks.values || null)
        .tickSize(ticks.size || 6)
        .innerTickSize(ticks.innerTickSize || 6)
        .outerTickSize(ticks.outerTickSize || 6)
        .tickPadding(ticks.padding || 3)
        .tickFormat(ticks.format || null);

      var g = d3.select(this).selectAll('g.' + cssClass)
        .data([data]);

      g.exit().remove();
      g.enter().append('g');

      // Attach axis
      g.attr('class', cssClass + ' axis')
        .attr('transform', transform)
        .call(axis);

      if (rotateLabels) {
        var axisLength;

        if (_.isFunction(scale.rangeBand)) {
          axisLength = Math.abs(_.last(scale.range()) + scale.rangeBand());
        } else {
          axisLength = Math.abs(scale.range()[1] - scale.range()[0]);
        }

        rotation
          .axisLength(axisLength)
          .measure(rotateOptions.measure || 'width')
          .text({
            transform: rotateOptions.transform || 'translate(0,0)rotate(-45)'
          });

        g.call(rotation);
      }

      var text = g.selectAll('text.title')
        .data([data]);

      text.exit().remove();
      text.enter().append('text')
        .attr('class', title.class || 'title');

      text
        .attr('x', title.x || 6)
        .attr('y', title.y || 6)
        .attr('dx', title.dx || '')
        .attr('dy', title.dy || '.71em')
        .attr('transform', title.transform || 'translate(0,0)')
        .style('text-anchor', title.anchor || 'end')
        .text(title.text || '');
    });
  }

  // Public API
  generator.scale = function (v) {
    if (!arguments.length) return scale;
    scale = v;
    return generator;
  };

  generator.orientation = function (v) {
    if (!arguments.length) return orientation;
    orientation = v;
    return generator;
  };

  generator.class = function (v) {
    if (!arguments.length) return cssClass;
    cssClass = v;
    return generator;
  };

  generator.transform = function (v) {
    if (!arguments.length) return transform;
    transform = v;
    return generator;
  };

  generator.ticks = function (v) {
    if (!arguments.length) return ticks;
    ticks.number = typeof v.number !== 'undefined' ? v.number : ticks.number;
    ticks.values = typeof v.values !== 'undefined' ? v.values : ticks.values;
    ticks.size = typeof v.size !== 'undefined' ? v.size : ticks.size;
    ticks.padding = typeof v.padding !== 'undefined' ? v.padding : ticks.padding;
    ticks.format = typeof v.format !== 'undefined' ? v.format : ticks.format;
    ticks.innerTickSize = typeof v.innerTickSize !== 'undefined' ? v.innerTickSize : ticks.innerTickSize;
    ticks.outerTickSize = typeof v.outerTickSize !== 'undefined' ? v.outerTickSize : ticks.outerTickSize;
    return generator;
  };

  generator.rotateLabels = function (v) {
    if (!arguments.length) return rotateLabels;
    rotateLabels = v;
    return generator;
  };

  generator.rotateOptions = function (v) {
    if (!arguments.length) return rotateOptions;
    rotateOptions.measure = typeof v.measure !== 'undefined' ? v.measure : rotateOptions.measure;
    rotateOptions.transform = typeof v.transform !== 'undefined' ? v.transform : rotateOptions.transform;
    return generator;
  };

  generator.title = function (v) {
    if (!arguments.length) return title;
    title.class = typeof v.class !== 'undefined' ? _.class : title.class;
    title.x = typeof v.x !== 'undefined' ? v.x : title.x;
    title.y = typeof v.y !== 'undefined' ? v.y : title.y;
    title.dx = typeof v.dx !== 'undefined' ? v.dx : title.dx;
    title.dy = typeof v.dy !== 'undefined' ? v.dy : title.dy;
    title.transform = typeof v.transform !== 'undefined' ? v.transform : title.transform;
    title.anchor = typeof v.anchor !== 'undefined' ? v.anchor : title.anchor;
    title.text = typeof v.text !== 'undefined' ? v.text : title.text;
    return generator;
  };

  return generator;
};

module.exports = axes;
