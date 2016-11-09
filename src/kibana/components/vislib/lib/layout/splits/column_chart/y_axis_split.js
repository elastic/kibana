define(function () {
  return function YAxisSplitFactory(d3) {
    /*
     * Adds div DOM elements to the `.y-axis-div-wrapper` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.y-axis-div` elements as row objects.
     */
    // render and get bounding box width
    var YAxisSplit = function (divClass, isSecondary) {
      this.yAxisDivClass = divClass;
      this.isSecondary = isSecondary;
    };

    YAxisSplit.prototype.build = function () {
      var self = this;
      return function (selection, parent, opts) {
        var yAxis = self.isSecondary ?
                      opts && opts.secondaryYAxis :
                      opts && opts.yAxis;

        selection.each(function () {
          var div = d3.select(this);

          div.call(self.setWidth, yAxis);

          div.selectAll('.' + self.yAxisDivClass)
          .append('div')
          .data(function (d) {
            return d.rows ? d.rows : [d];
          })
          .enter()
            .append('div')
            .attr('class', self.yAxisDivClass);
        });
      };
    };

    YAxisSplit.prototype.setWidth = function (el, yAxis) {
      if (!(yAxis && yAxis.el)) return;

      var padding = 5;
      var height = parseInt(el.node().clientHeight, 10);

      // render svg and get the width of the bounding box
      var svg = d3.select('body')
      .append('svg')
      .attr('style', 'position:absolute; top:-10000; left:-10000');
      var width = svg.append('g')
      .call(yAxis.getYAxis(height)).node().getBBox().width + padding;
      svg.remove();

      el.style('width', (width + padding) + 'px');
    };

    return YAxisSplit;
  };
});
