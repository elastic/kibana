define(function (require) {
  return function XAxisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));

    _(XAxis).inherits(Chart);
    function XAxis(args) {
      XAxis.Super.apply(this, arguments);
      this.el = args.el;
      this.data = args.data;
      this._attr = args.attr;
    }

    XAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.x-axis-div').call(this.appendSVG());
    };

    XAxis.prototype.getScale = function (ordered) {
      if (ordered && ordered.date) {
        return d3.time.scale();
      }
      return d3.scale.ordinal();
    };

    XAxis.prototype.getDomain = function (scale, ordered) {
      var xValues = this.data.xValues();

      if (ordered && ordered.date) {
        // Calculate the min date, max date, and time interval;
        return this.getTimeDomain(scale, xValues, ordered);
      }
      return this.getOrdinalDomain(scale, xValues);
    };

    XAxis.prototype.getTimeDomain = function (scale, xValues, ordered) {
      // Should think about replacing
      var spacingPercentage = 0.25;
      var maxXValue = d3.max(xValues);
      var timeInterval = ordered.interval;
      // Take the min of the xValues or the ordered object
      var minDate = Math.min(d3.min(xValues), ordered.min);
      // Take the max of the xValues or the max date that is sent
      var maxDate = +maxXValue + timeInterval <= ordered.max ? ordered.max : +maxXValue + timeInterval * (1 - spacingPercentage);

      scale.domain([minDate, maxDate]);

      return scale;
    };

    XAxis.prototype.getOrdinalDomain = function (scale, xValues) {
      return scale.domain(xValues);
    };

    XAxis.prototype.getRange = function (scale, ordered, width) {
      if (ordered && ordered.date) {
        scale.range([0, width]);
        return scale;
      }
      scale.rangeBands([0, width], 0.1);
      return scale;
    };

    XAxis.prototype.getXScale = function (ordered, width) {
      var scale = this.getScale(ordered);
      var domain = this.getDomain(scale, ordered);
      var xScale = this.getRange(domain, ordered, width);

      return xScale;
    };

    XAxis.prototype.getXAxis = function (width) {
      var ordered = this.data.get('ordered');

      this.xAxisFormatter = this.data.get('xAxisFormatter');
      this.xScale = this.getXScale(ordered, width);

      this.xAxis = d3.svg.axis()
        .scale(this.xScale)
        .tickFormat(this.xAxisFormatter)
        .orient('bottom');
    };

    XAxis.prototype.appendSVG = function () {
      var self = this;
      var margin = this._attr.margin;
      var div;
      var width;
      var height;
      var svg;
      var bbox;
      var tickN;
      var ticksLength;
      var rotatedTicksLength;
      var percentage;

      this.getXAxis();

      // set var for discover view
      if ($('.discover-timechart').length) {
        self.isDiscover = true;
        self.isRotated = false;
      } else {
        self.isDiscover = false;
      }

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          width = $(this).width() - margin.left - margin.right;
          height = $(this).height();

          self.validateHeightAndWidth(div, width, height);

          // Return access to xAxis variable on the object
          self.getXAxis(width);

          svg = div.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height);

          svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(' + margin.left + ',0)')
            .call(self.xAxis);

          // get label widths
          bbox = selection.selectAll('.tick text').node().getBBox();
          tickN = selection.selectAll('.tick text')[0].length;
          ticksLength = bbox.width * 1.05 * tickN;
          
          // rotate & filter does not apply to discover view
          if (!self.isDiscover && ticksLength > width) {
            self.rotateAxisLabels(selection);
            self.isRotated = true;
          } else {
            self.isRotated = false;
          }

          // filter labels to prevent overlap of rotated labels
          rotatedTicksLength = bbox.height * 1.05 * tickN;
          percentage = Math.floor(rotatedTicksLength / width) + 1;
          if (rotatedTicksLength > width) {
            self.filterAxisLabels(selection, percentage);
          }

          // update layout divs to tick lengths
          self.updateLayoutForRotatedLabels(div, self.getMaxLabelLength(selection));
        });
      };
    };

    XAxis.prototype.rotateAxisLabels = function (selection) {
      return selection.selectAll('.tick text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '-.60em')
        .attr('transform', function () {
          return 'rotate(-90)';
        });
    };

    XAxis.prototype.filterAxisLabels = function (selection, nth) {
      var self = this;
      var xAxisFormatter = this.data.get('xAxisFormatter');
      return selection.selectAll('text')
        .text(function (d, i) {
          return i % nth === 0 ? xAxisFormatter(d) : '';
        });
    };

    XAxis.prototype.getMaxLabelLength = function (selection) {
      var svg = selection.select('svg');
      var labels = selection.selectAll('.tick text');
      var param;
      var arr = [];
      var length;
      var spacer;
      
      // if rotated use width else use height
      param = 'width';
      if (!this.isRotated) {
        param = 'height';
      }
      
      // get max tick label length
      _.forEach(labels[0], function (n) {
        arr.push(n.getBBox()[param]);
      });
      return length = _.max(arr);
    };

    XAxis.prototype.updateLayoutForRotatedLabels = function (selection, length) {
      var svg = selection.select('svg');
      var spacer;
      var tickspace = 10;
      length += tickspace;
      // if rows, space for chart title
      // if cols, space for chart title + axis label
      spacer = length + 18;
      if (this.data.data.columns) {
        spacer = length + 32;
      }
      
      // set heights of svg, x-axis-div and x-axis-div-wrapper to fit ticklabels
      svg.attr('height', length);
      $('.x-axis-div-wrapper').height(length);
      $('.x-axis-div').height(length);

      // set heights of y-axis-spacer-block and x-axis-wrapper to fit resized x axis      
      $('.y-axis-spacer-block').height(spacer);
      $('.x-axis-wrapper').height(spacer);
      
    };

    return XAxis;
  };
});
