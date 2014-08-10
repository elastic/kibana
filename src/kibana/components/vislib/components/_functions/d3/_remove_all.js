define(function () {
  return function RemoveAllUtilService(d3) {
    return function (el) {
      return d3.select(el).selectAll('*')
        .remove();
    };
  };
});
