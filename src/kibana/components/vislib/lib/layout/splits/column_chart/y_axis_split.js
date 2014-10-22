define(function () {
  return function YAxisSplitFactory(d3) {

    /*
     * Adds div DOM elements to the `.y-axis-div-wrapper` element based on the data layout.
     * For example, if the data has rows, it returns the same number of
     * `.y-axis-div` elements as row objects.
     */

    return function (selection) {
      selection.each(function () {
        var div = d3.select(this);

        div.selectAll('.y-axis-div')
        .append('div')
        .data(function (d) {
          return d.rows ? d.rows : [d];
        })
        .enter()
          .append('div')
          .attr('class', 'y-axis-div');
      });
    };
  };
});