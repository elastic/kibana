define(function () {
  return function TooltipUtilService(d3) {
    return function (self) {
      return function (selection) {
        selection.each(function () {
          var tooltipDiv = d3.select('.' + self.tooltipClass);
          var element = d3.select(this);

          element
            .on('mousemove', function (d) {
              var mouseMove = {
                left: d3.event.pageX,
                top: d3.event.pageY
              };

              return tooltipDiv.datum(d)
                .text(self.tooltipFormatter)
                .style('visibility', 'visible')
                .style('top', mouseMove.top + 'px')
                .style('left', mouseMove.left + 10 + 'px');
            })
            .on('mouseout', function () {
              return tooltipDiv.style('visibility', 'hidden');
            });
        });
      };
    };
  };
});
