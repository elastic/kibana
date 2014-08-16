define(function (require) {
  return function AxisTitleFactory(d3) {
    var $ = require('jquery');

    function AxisTitle(xTitle, yTitle) {
      this.xTitle = xTitle;
      this.yTitle = yTitle;
    }

    AxisTitle.prototype.append = function () {
      var xWidth = $('.x-axis-title').width();
      var xHeight = $('.x-axis-title').height();
      var yWidth = $('.y-axis-title').width();
      var yHeight = $('.y-axis-title').height();

      d3.select('.x-axis-title').append('svg')
        .attr('width', xWidth)
        .attr('height', xHeight)
        .append('text')
        .attr('transform', 'translate(' + xWidth / 2 + ',' + xHeight / 2 + ')')
        .attr('text-anchor', 'middle')
        .text(this.xTitle);


      // Append y axis title
      d3.select('.y-axis-title').append('svg')
        .attr('width', yWidth)
        .attr('height', yHeight)
        .append('text')
        .attr('transform', 'translate(' + yWidth + ',' + yHeight / 2 + ')rotate(270)')
        .attr('text-anchor', 'middle')
        .text(this.yTitle);
    };

    return AxisTitle;
  };
});
