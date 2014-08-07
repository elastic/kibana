define(function () {
  return function CallFunctionUtilService(d3) {
    return function (el, data, callback) {
      return d3.select(el)
        .datum(data)
        .call(callback);
    };
  };
});
