define(function (require) {
  return function LegendUtilService(d3, Private) {
    var appendLegendDiv = Private(require('components/vislib/utils/d3/_append_elem'));
    var createHeader = Private(require('components/vislib/utils/d3/legend/header'));
    var toggleLegend = Private(require('components/vislib/utils/d3/legend/toggle'));
    var createList = Private(require('components/vislib/utils/d3/legend/list'));
    var classify = Private(require('components/vislib/utils/d3/legend/classify'));

    return function (args) {
      var legendDiv = appendLegendDiv(args.el, 'div', args._attr.legendClass);
      var items = args.labels;

      createHeader(legendDiv)
        .on('click', toggleLegend);

      createList(legendDiv, items, args)
        .on('mouseover', function (d) {
          var liClass = '.' + classify(args.color(d));
          d3.selectAll('.color').style('opacity', args._attr.blurredOpacity);

          // Select series on chart
          d3.selectAll(liClass).style('opacity', args._attr.focusOpacity);
        })
        .on('mouseout', function () {
          d3.selectAll('.color').style('opacity', args._attr.defaultOpacity);
        });
    };
  };
});
