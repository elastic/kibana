define(function (require) {
  return function ChartTitleFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));
    var Tooltip = Private(require('components/vislib/components/tooltip/tooltip'));

    /**
     * Appends chart titles to the visualization
     *
     * @class ChartTitle
     * @constructor
     * @param el {HTMLElement} Reference to DOM element
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

    /**
     * Renders chart titles
     *
     * @method render
     * @returns {D3.Selection|D3.Transition.Transition} DOM element with chart titles
     */
    ChartTitle.prototype.render = function () {
      return d3.select(this.el).selectAll('.chart-title').call(this.draw());
    };

    /**
     * Truncates chart title text
     *
     * @method truncate
     * @param size {Number} Height or width of the HTML Element
     * @returns {Function} Truncates text
     */
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
            self.addMouseEvents(text);

            return text.text(str);
          }

          return text.text();
        });
      };
    };

    /**
     * Adds tooltip events on truncated chart titles
     *
     * @method addMouseEvents
     * @param target {HTMLElement} DOM element to attach event listeners
     * @returns {*} DOM element with event listeners attached
     */
    ChartTitle.prototype.addMouseEvents = function (target) {
      if (this.tooltip) {
        return target.call(this.tooltip.render());
      }
    };

    /**
     * Appends chart titles to the visualization
     *
     * @method draw
     * @returns {Function} Appends chart titles to a D3 selection
     */
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
              return 'translate(' + txtHtOffset + ',' + height / 2 + ')rotate(270)';
            }
            return 'translate(' + width / 2 + ',' + txtHtOffset + ')';
          })
          .attr('text-anchor', 'middle')
          .text(function (d) {
            return d.label;
          });

          // truncate long chart titles
          div.selectAll('text')
          .call(self.truncate(size));
        });
      };
    };

    return ChartTitle;
  };
});
