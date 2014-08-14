define(function (require) {
  return function LegendUtilService(d3, Private) {
    var appendLegendDiv = Private(require('components/vislib/components/_functions/d3/_append_elem'));
    var createHeader = Private(require('components/vislib/components/Legend/header'));
    var toggleLegend = Private(require('components/vislib/components/Legend/toggle'));
    var createList = Private(require('components/vislib/components/Legend/list'));
    var classify = Private(require('components/vislib/components/Legend/classify'));

    return function (args) {
      var legendDiv = d3.select('.' + args.legend._attr.legendClass);
      var items = args.labels;
      var header = createHeader(legendDiv);
      var headerIcon = d3.select('.legend-toggle');
      var list = createList(legendDiv, items, args);

      headerIcon.on('click', function (d) {
        toggleLegend(args);
      });

      d3.selectAll('.color')
        .on('mouseover', function (d) {
          var liClass = '.' + classify(args.color(d));
          d3.selectAll('.color').style('opacity', args.legend._attr.blurredOpacity);
          
          // select series on chart
          d3.selectAll(liClass).style('opacity', args.legend._attr.focusOpacity);

          d3.selectAll('.color')
            .style('opacity', args.legend._attr.blurredOpacity);
          
          // Select series on chart
          d3.selectAll(liClass)
            .style('opacity', args.legend._attr.focusOpacity);
        });

      d3.selectAll('.color')
        .on('mouseout', function () {
          d3.selectAll('.color').style('opacity', args.legend._attr.defaultOpacity);
        });

      // add/remove class for legend-open
      if (args.isLegendOpen) {
        d3.select('.' + args.legend._attr.legendClass)
          .classed('legend-open', true);
      } else {
        d3.select('.' + args.legend._attr.legendClass)
          .classed('legend-open', false);
      }

    };
  };
});
