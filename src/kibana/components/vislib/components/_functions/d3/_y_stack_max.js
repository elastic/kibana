define(function () {
  return function YStackMaxUtilService(d3) {
    return function (stackedData) {
      return d3.max(stackedData, function (data) {
        return d3.max(data, function (d) {
          return d.y0 + d.y;
        });
      });
    };
  };
});
