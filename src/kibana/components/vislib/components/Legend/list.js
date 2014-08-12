define(function (require) {
  return function LegendListUtilService(Private) {
    var classify = Private(require('components/vislib/components/Legend/classify'));

    return function (d3el, arrOfItms, args) {
      console.log(args);
      return d3el.append('ul')
        .attr('class', function () {
          if (args.legend._attr.isLegendOpen) {
            return 'legend-ul';
          }
          //return 'legend-ul';
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
