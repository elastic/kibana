define(function () {
  return function splittingUtilService(d3) {
    return function split(selection) {
      selection.each(function (data) {
        var div = d3.select(this)
          .attr('class', function () {
            return data.rows ? 'chart-wrapper-row' : data.columns ? 'chart-wrapper-column' : 'chart-wrapper';
          });
        var divClass;

        var charts = div.selectAll('charts')
          .append('div')
          .data(function (d) {
            divClass = d.rows ? 'chart-row' : d.columns ? 'chart-column' : 'chart';
            return d.rows ? d.rows : d.columns ? d.columns : [d];
          })
          .enter().append('div')
          .attr('class', function () {
            return divClass;
          });

        if (!data.series) {
          charts.call(split);
        }
      });
    };
  };
});