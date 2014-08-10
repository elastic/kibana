define(function () {
  return function YAxisSplitUtilService(d3) {
    return function () {
      return function (selection) {
        selection.each(function (data) {
          var div = d3.select(this);

          div.append('div')
            .data(data, function (d) {
              if (d.columns && d.config.shareYAxis) {
                return [d];
              }
              return d.rows ? d.rows : [d];
            })
            .enter()
            .append('div')
            .attr('class', 'y-axis-div');
        });
      };
    };
  };
});
