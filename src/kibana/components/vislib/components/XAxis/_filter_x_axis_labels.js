define(function () {
  return function FilterAxisLabelsUtilService() {
    return function (selection, nth) {

      // selection should be x axis
      return selection
        .selectAll('text')
        .text(function (d, i) {
          return i % nth === 0 ? d.xAxisLabel : '';
        });
    };
  };
});
