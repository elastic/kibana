define(function () {
  return function AppendXAxisUtilService() {
    return function (d3el, height, xAxis, name) {
      name = typeof name !== 'undefined' ? name : 'x axis';

      return d3el.append('g')
        .attr('class', name)
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);
    };
  };
});
