define(function () {
  return function LegendToggleUtilService(d3) {
    return function (args) {
      
      if (args.legend._attr.isLegendOpen) {
        // close the legend
        d3.select('.' + args.legend._attr.legendClass)
          .classed('hidden', true);
        d3.select('ul.legend-ul')
          .classed('hidden', true);
        args.legend._attr.isLegendOpen = true;
      } else {
        d3.select('.' + args.legend._attr.legendClass)
          .classed('hidden', false);
        d3.select('ul.legend-ul')
          .classed('hidden', false);
        args.legend._attr.isLegendOpen = false;
      }
      
    };
  };
});
