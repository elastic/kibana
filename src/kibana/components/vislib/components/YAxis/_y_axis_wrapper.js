define(function () {
  return function YAxisWrapperUtilService(d3) {
    return d3.select('visualize-wrapper').append('div')
      .attr('class', 'y-axis-wrapper');
  };
});
