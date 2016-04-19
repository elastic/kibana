var d3 = require('d3');
var truncate = require('plugins/heatmap/vis/components/axis/truncate');

function rotate() {
  var axisLength = 100;
  var measure = 'width';
  var labelPadding = 5;
  var truncateLength = 10;
  var text = {};

  function component(g) {
    g.each(function () {
      var ticks = d3.select(this).selectAll('.tick text');
      var numOfTicks = ticks[0].length;
      var maxTickLabelLength = (axisLength / numOfTicks) - labelPadding;
      var isRotated = false;

      ticks.each(function () {
        var labelLength = this.getBBox()[measure];
        if (labelLength >= maxTickLabelLength) {
          isRotated = true;
        }
      });

      // Rotate and truncate
      if (isRotated) {
        ticks
          .attr('transform', text.transform || 'translate(0,0)rotate(-45)')
          .attr('x', text.x || 0)
          .attr('y', text.y || 6)
          .attr('dx', text.dx || '')
          .attr('dy', text.dy || '.71em')
          .style('text-anchor', text.anchor || 'end');

        // Truncation logic goes here
        ticks.each(function () {
          d3.select(this).call(truncate().maxCharLength(truncateLength));
        });
      } else {
        // Default transform
        ticks.attr('transform', text.defaultTransform || 'translate(0,0)');
      }
    });
  }

  // Public API
  component.axisLength = function (_) {
    if (!arguments.length) return axisLength;
    axisLength = typeof _ === 'number' ? _ : axisLength;
    return component;
  };

  component.measure = function (_) {
    if (!arguments.length) return measure;
    measure = typeof _ === 'string' ? _ : measure;
    return component;
  };

  component.labelPadding = function (_) {
    if (!arguments.length) return labelPadding;
    labelPadding = typeof _ === 'number' ? _ : labelPadding;
    return component;
  };

  component.truncateLength = function (_) {
    if (!arguments.length) return truncateLength;
    truncateLength = typeof _ === 'number' ? _ : truncateLength;
    return component;
  };

  component.text = function (_) {
    if (!arguments.length) return text;
    text.transform = typeof _.transform !== 'undefined' ? _.transform : text.transform;
    text.defaultTransform = typeof _.defaultTransform !== 'undefined' ? _.defaultTransform : text.defaultTransform;
    text.x = typeof _.x !== 'undefined' ? _.x : text.x;
    text.y = typeof _.y !== 'undefined' ? _.y : text.y;
    text.dx = typeof _.dx !== 'undefined' ? _.dx : text.dx;
    text.dy = typeof _.dy !== 'undefined' ? _.dy : text.dy;
    text.anchor = typeof _.anchor !== 'undefined' ? _.anchor : text.anchor;
    return component;
  };

  return component;
};

module.exports = rotate;
