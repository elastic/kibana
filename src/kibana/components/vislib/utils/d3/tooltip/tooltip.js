define(function (require) {
  return function TooltipUtilService(d3, Private) {
    var appendTooltipDiv = Private(require('components/vislib/utils/d3/_append_elem'));

    return function (args) {
      var tooltipDiv = appendTooltipDiv(args.el, 'div', args._attr.tooltipClass);

      return function (selection) {
        selection.each(function () {
          var element = d3.select(this);

          element
            .on('mousemove', function (d) {
              var mouseMove = {
                left: d3.event.pageX,
                top: d3.event.pageY
              };

              return tooltipDiv
                .datum(d)
                .text(args._attr.tooltipFormatter)
                .style('visibility', 'visible')
                .style('top', mouseMove.top + 'px')
                .style('left', mouseMove.left + 10 + 'px');
            })
            .on('mouseout', function () {
              return tooltipDiv
                .style('visibility', 'hidden');
            });
        });
      };
    };
  };
});
