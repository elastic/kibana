define(function () {
  return function CallFunctionUtilService() {
    return function (d3el, data, callback) {
      return d3el.datum(data)
        .call(callback);
    };
  };
});
