define(function () {
  return function AppendElemUtilService(d3) {
    // Accepts an DOM element, an DOM element or SVG type,
    // and a optional class name
    return function (el, type, name) {
      name = typeof name !== 'undefined' ? name : type;

      // Returns a d3 selection
      return d3.select(el).append(type)
        .attr('class', name);
    };
  };
});
