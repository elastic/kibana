define(function () {
  return function XAxisWrapperUtilService(d3) {
    return d3.select('vis-wrapper').append('div')
      .attr('class', 'x-axis-wrapper');
  };
});
