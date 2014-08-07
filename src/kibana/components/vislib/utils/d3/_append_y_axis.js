define(function () {
  return function AppendYAxisUtilService() {
    return function (d3el, yAxis, name) {
      name = typeof name !== 'undefined' ? name : 'y axis';

      return d3el.append('g')
        .attr('class', name)
        .call(yAxis);
    };
  };
});
