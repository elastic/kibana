define(function () {
  return function LegendToggleUtilService(d3) {
    return function (args) {

      if (args.isLegendOpen) {
        // close legend
        args.isLegendOpen = false;
        d3.select('.' + args.legend._attr.legendClass)
          .classed('legend-open', false);
        d3.select('ul.legend-ul')
          .classed('hidden', true);
      } else {
        // open legend
        args.isLegendOpen = true;
        d3.select('.' + args.legend._attr.legendClass)
          .classed('legend-open', true);
        d3.select('ul.legend-ul')
          .classed('hidden', false);
      }
    };
  };
});
