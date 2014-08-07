define(function () {
  return function AppendElemUtilService(d3) {
    return function (el, type, name) {
      name = typeof name !== 'undefined' ? name : type;

      return d3.select(el).append(type)
        .attr('class', name);
    };
  };
});
