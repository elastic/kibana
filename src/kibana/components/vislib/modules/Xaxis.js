define(function (require) {
  return function XAxisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var Chart = Private(require('components/vislib/modules/_chart'));

    _(XAxis).inherits(Chart);
    function XAxis(args) {
      if (!(this instanceof XAxis)) {
        return new XAxis(args);
      }

      XAxis.Super.apply(this, arguments);
      this.el = args.el;
      this.data = args.data;
      this._attr = args.attr;
    }

    XAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.x-axis-div').call(this.draw());
    };

    XAxis.prototype.removeAll = function () {
      return d3.select(this.el).selectAll('.x-axis-div').selectAll('*').remove();
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

    XAxis.prototype.draw = function () {
      var self = this;
      var margin = this._attr.margin;
      var div;
      var width;
      var height;
      var svg;

      this.getXAxis();

      // set var for discover view
      if ($('.discover-timechart').length) {
        self._attr.isDiscover = true;
        self._attr.isRotated = false;
      } else {
        self._attr.isDiscover = false;
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
        });

        self.checkTickLabels(selection);

      };
    };

    XAxis.prototype.checkTickLabels = function (selection) {
      
      var self = this;
      var margin = this._attr.margin;
      var div;
      var width;
      var height;
      var labels;
      var widthArr = [];
      var heightArr = [];
      var subtotalW;
      var subtotalH;
      var tickN;
      var maxWidth;
      var maxHeight;
      var total;
      var nth;
      var rotate = false;
      self._attr.isRotated = false;
      
      selection.each(function () {
        // select each x axis
        div = d3.select(this);
        width = $(this).width() - margin.left - margin.right;
        height = $(this).height();
        labels = selection.selectAll('.tick text');

        // total widths for every label from each x axis
        subtotalW = 0;
        subtotalH = 0;
        _.forEach(labels[0], function (n) {
          subtotalW += n.getBBox().width;
          subtotalH += n.getBBox().height;
        });

        widthArr.push(subtotalW);
        heightArr.push(subtotalH);

        // should rotate if any chart subtotal > width
        if (subtotalW > width) {
          rotate = true;
        }
      });

      // apply rotate if not discover view
      if (!self._attr.isDiscover && rotate) {
        self.rotateAxisLabels(selection);
        self._attr.isRotated = true;
      }
      
      // filter labels to prevent overlap of text
      if (self._attr.isRotated) {
        // if rotated, use label heights
        maxHeight = _.max(heightArr);
        total = _.reduce(heightArr, function (sum, n) {
          return sum + (n * 1.05);
        });
        nth = 1 + Math.floor(maxHeight / width);
      } else {
        // if not rotated, use label widths
        maxWidth = _.max(widthArr);
        total = _.reduce(widthArr, function (sum, n) {
          return sum + (n * 1.05);
        });
        nth = 1 + Math.floor(maxWidth / width);
      }
      if (nth > 1) {
        self.filterAxisLabels(selection, nth);
      }
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

    return XAxis;
  };
});
