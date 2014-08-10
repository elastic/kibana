define(function () {
  return function XAxisSplitUtilService(d3) {
    return function () {
      return function (selection) {
        selection.each(function (data) {
          var div = d3.select(this);

          div.append('div')
            .data(data, function (d) {
              if (d.rows && d.ordered.date) {
                return [d];
              }
              return d.columns ? d.columns : [d];
            })
            .enter()
            .append('div')
            .attr('class', 'x-axis-div');
        });
      };
    };
  };
});
