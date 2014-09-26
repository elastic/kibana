define(function (require) {
  return function ChartTitleFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));
    var Tooltip = Private(require('components/vislib/lib/tooltip'));

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
      this.tooltip = new Tooltip(el, function (d) {
        return d.label;
      });
    }

    _(ChartTitle.prototype).extend(ErrorHandler.prototype);

    // Render chart titles
    ChartTitle.prototype.render = function () {
      return d3.select(this.el).selectAll('.chart-title').call(this.draw());
    };

    // Return a function that truncates chart title text
    ChartTitle.prototype.truncate = function (size) {
      var self = this;

      return function (selection) {
        selection.each(function () {
          var text = d3.select(this);
          var n = text[0].length;
          var maxWidth = size / n * 0.9;
          var length = this.getComputedTextLength();
          var str;
          var avg;
          var end;

          if (length > maxWidth) {
            str = text.text();
            avg = length / str.length;
            end = Math.floor(maxWidth / avg) - 5;

            str = str.substr(0, end) + '...';

            // mouseover and mouseout
            self.addMouseEvents(text);

            return text.text(str);
          }

          return text.text();
        });
      };
    };

    // Add mouseover and mouseout events on truncated chart titles
    ChartTitle.prototype.addMouseEvents = function (target) {
      if (this.tooltip) {
        return target.call(this.tooltip.render());
      }
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
          var size = dataType === 'rows' ? height : width;
          var txtHtOffset = 11;

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
                return 'translate(' + txtHtOffset + ',' + height / 2 + ')rotate(270)';
              }
              return 'translate(' + width / 2 + ',' + txtHtOffset + ')';
            })
            .attr('text-anchor', 'middle')
            .text(function (d) {
              return d.label;
            });

          // truncate long chart titles
          div.selectAll('text').call(self.truncate(size));
        });
      };
    };

    return ChartTitle;
  };
});
