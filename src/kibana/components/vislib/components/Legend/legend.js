define(function (require) {
  return function LegendUtilService(d3, Private) {
    var appendLegendDiv = Private(require('components/vislib/components/_functions/d3/_append_elem'));
    var createHeader = Private(require('components/vislib/components/Legend/header'));
    var toggleLegend = Private(require('components/vislib/components/Legend/toggle'));
    var createList = Private(require('components/vislib/components/Legend/list'));
    var classify = Private(require('components/vislib/components/Legend/classify'));

    return function (self) {
      var legendDiv = d3.select('.' + self.legendClass);
      var items = self.labels;
      var header = createHeader(legendDiv);
      var headerIcon = d3.select('.legend-toggle');
      var list = createList(legendDiv, items, self);

      headerIcon.on('click', function (d) {
        toggleLegend(self);
      });

      d3.selectAll('.color')
        .on('mouseover', function (d) {
          var liClass = '.' + classify(self.color(d));
          d3.selectAll('.color').style('opacity', self.blurredOpacity);
          
          // select series on chart
          d3.selectAll(liClass).style('opacity', self.focusOpacity);

          d3.selectAll('.color')
            .style('opacity', self.blurredOpacity);
          
          // Select series on chart
          d3.selectAll(liClass)
            .style('opacity', self.focusOpacity);
        });

      d3.selectAll('.color')
        .on('mouseout', function () {
          d3.selectAll('.color').style('opacity', self.defaultOpacity);
        });

      // add/remove class to open legend
      if (self.isOpen) {
        d3.select('.' + self.legendClass)
          .classed('open4', true);
      } else {
        d3.select('.' + self.legendClass)
          .classed('open4', false);
      }

      // createList(legendDiv, items, self)
      //   .on('mouseover', function (d) {
      //     var liClass = '.' + classify(self.color(d));
      //     d3.selectAll('.color').style('opacity', self.blurredOpacity);

      //     // Select series on chart
      //     d3.selectAll(liClass).style('opacity', self.focusOpacity);
      //   })
      //   .on('mouseout', function () {
      //     d3.selectAll('.color').style('opacity', self.defaultOpacity);
      //   });
    };
  };
});
