var d3 = require('d3');
var _ = require('lodash');

function gGenerator() {
  var cssClass = 'group';
  var transform = 'translate(0,0)';

  function generator(selection) {
    selection.each(function (data, index) {
      var g = d3.select(this).selectAll('g.' + cssClass)
        .data(data);

      g.exit().remove();

      g.enter().append('g')
        .attr('class', cssClass);

      g.attr('transform', transform);
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

  return generator;
}

module.exports = gGenerator;
