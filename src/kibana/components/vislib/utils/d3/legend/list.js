define(function (require) {
  return function LegendListUtilService(Private) {
    var classify = Private(require('components/vislib/utils/d3/legend/classify'));

    return function (d3el, arrOfItms, args) {
      return d3el.append('ul')
        .attr('class', function () {
          if (args._attr.isOpen) {
            return 'legend-ul';
          }
          return 'legend-ul hidden';
        })
        .selectAll('li')
        .data(arrOfItms)
        .enter()
        .append('li')
        .attr('class', function (d) {
          return 'color ' + classify(args.color(d));
        })
        .html(
        function (d) {
          return '<span class="dots" style="background:' + args.color(d) +
            '"></span>' + d + '';
        });
    };
  };
});
