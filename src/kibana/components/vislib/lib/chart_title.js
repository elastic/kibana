define(function (require) {
  return function ChartTitleFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));

    /*
     * Append chart titles to the visualization
     * arguments:
     *  el => reference to a DOM element
     */
    function ChartTitle(el) {
      if (!(this instanceof ChartTitle)) {
        return new ChartTitle(el);
      }

      this.el = el;
    }

    _(ChartTitle.prototype).extend(ErrorHandler.prototype);

    // Render chart titles
    ChartTitle.prototype.render = function () {
      d3.select(this.el).selectAll('.chart-title').call(this.draw());
      d3.select(this.el).selectAll('.chart-title').call(this.truncate());
    };

    // Return a function that truncates chart title text
    // Need to refactor this function, so that it is called inside the draw method
    ChartTitle.prototype.truncate = function () {
      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);
          var dataType = this.parentNode.__data__.rows ? 'rows' : 'columns';

          var text = div.select('text');
          var textLength = text.node().getComputedTextLength();
          var maxWidth = dataType === 'rows' ? $(this).height() : $(this).width();
          var subtractionPercentage = maxWidth * 0.05;
          var str = text.text();

          // if length of text is longer than the chart div, truncate
          maxWidth = maxWidth - subtractionPercentage;
          if (textLength > maxWidth) {
            var avg = textLength / str.length;
            var end = Math.floor(maxWidth / avg);

            str = str.substr(0, end) + '...';
          }

          text.text(str);
        });
      };
    };

    // Return a callback function that appends chart titles to the visualization
    ChartTitle.prototype.draw = function () {
      var self = this;

      return function (selection) {
        selection.each(function () {
          var div = d3.select(this);
          var dataType = this.parentNode.__data__.rows ? 'rows' : 'columns';
          var width = $(this).width();
          var height = $(this).height();

          // Check if width or height are 0 or NaN
          self.validateWidthandHeight(width, height);

          div.append('svg')
            .attr('width', function () {
              if (dataType === 'rows') {
                return 15;
              }
              return width;
            })
            .attr('height', height)
            .append('text')
            .attr('transform', function () {
              if (dataType === 'rows') {
                // if `rows`, rotate the chart titles
                return 'translate(11,' + height / 2 + ')rotate(270)';
              }
              return 'translate(' + width / 2 + ',11)';
            })
            .attr('text-anchor', 'middle')
            .text(function (d) {
              return d.label;
            });
        });
      };
    };

    return ChartTitle;
  };
});
