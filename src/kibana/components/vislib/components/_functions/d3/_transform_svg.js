define(function () {
  return function TransformSVGUtilService() {
    return function (svg, left, top) {
      return svg.append('g')
        .attr('transform', 'translate(' + left + ',' + top + ')');
    };
  };
});
