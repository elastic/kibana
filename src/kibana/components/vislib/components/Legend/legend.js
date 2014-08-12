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
      
      headerIcon.on('click', function (d) {
        toggleLegend(args);
      });

      createList(legendDiv, items, args);

      d3.selectAll('.color')
        .on('mouseover', function (d) {
          var liClass = '.' + classify(args.color(d));
          console.log(d, liClass);
        });
          // var liClass = '.' + classify(args.color(d));
          // d3.selectAll('.color').style('opacity', args._attr.blurredOpacity);
          // // Select series on chart
          // d3.selectAll(liClass).style('opacity', args._attr.focusOpacity);
          // });
        // .on('mouseout', function () {
        //   d3.selectAll('.color').style('opacity', args._attr.defaultOpacity);
        // });

      
    };
  };
});
