define(function () {
  return function XAxisSplitFactory(d3) {
    return function (selection) {
      selection.each(function () {
        var div = d3.select(this);

        div.selectAll('.x-axis-div')
          .append('div')
          .data(function (d) {
            return d.columns ? d.columns : [d];
          })
          .enter()
          .append('div')
          .attr('class', 'x-axis-div');
      });
    };
  };
});