define(function (require) {
  return function LegendHeaderUtilService() {
    return function (d3el) {
      return d3el.append('div')
        .attr('class', 'header')
        .append('div')
        .attr('class', 'column-labels')
        .html('<span class="btn btn-xs btn-default legend-toggle">' +
          '<i class="fa fa-list-ul"></i></span>');
    };
  };
});
