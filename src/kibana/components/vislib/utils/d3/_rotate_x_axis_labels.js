define(function () {
  return function RotateXAxisLabelsUtilService() {
    return function (selection) {

      // selection should be x axis
      return selection
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', function () {
          return 'rotate(-90)';
        });
    };
  };
});
