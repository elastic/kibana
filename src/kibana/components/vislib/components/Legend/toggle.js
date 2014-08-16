define(function () {
  return function LegendToggleUtilService(d3) {
    return function (self) {
      console.log('toggle', self);
      if (self._attr.isOpen) {
        // close legend
        d3.select('.' + self._attr.legendClass)
          .classed('open4', false);
        d3.select('ul.legend-ul')
          .classed('hidden', true);
        self._attr.isOpen = false;

      } else {
        // open legend
        d3.select('.' + self._attr.legendClass)
          .classed('open4', true);
        d3.select('ul.legend-ul')
          .classed('hidden', false);
        self._attr.isOpen = true;
        
      }
    };
  };
});
