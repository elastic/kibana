define(function () {
  return function LegendToggleUtilService(d3) {
    return function (args) {
      if (args._attr.isOpen) {
        // Close the legend
        d3.select(args._attr.legendClass)
          .classed('legendwrapper legend-closed', true);
        d3.select('ul.legend-ul')
          .classed('hidden', true);
        args._attr.isOpen = false;
      } else {
        d3.select(args._attr.legendClass)
          .classed('legendwrapper legend-open', true);
        args._attr.isOpen = true;
      }
    };
  };
});
