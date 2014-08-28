define(function (require) {
  return function XAxisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    function XAxis(args) {
      if (!(this instanceof XAxis)) {
        return new XAxis(args);
      }

      this.el = args.el;
      this.xValues = args.xValues;
      this.ordered = args.ordered;
      this.xAxisFormatter = args.xAxisFormatter;
      this._attr = args._attr;
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
      if (ordered && ordered.date) {
        // Calculate the min date, max date, and time interval;
        return this.getTimeDomain(scale, this.xValues, ordered);
      }
      return this.getOrdinalDomain(scale, this.xValues);
    };

    XAxis.prototype.getTimeDomain = function (scale, xValues, ordered) {
      // Should think about replacing
      var spacingPercentage = 0.25;
      var maxXValue = d3.max(xValues);
      var timeInterval = ordered.interval;
      // Take the min of the xValues or the ordered object
      var minDate = Math.min(d3.min(xValues), ordered.min);
      // Take the max of the xValues or the max date that is sent
      var maxDate = +maxXValue <= ordered.max ? ordered.max : +maxXValue + timeInterval;

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
      this.xAxisFormatter = this.xAxisFormatter;
      this.xScale = this.getXScale(this.ordered, width);

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

      //self.resizeAxisLayoutForLabels(selection);
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
      return selection.selectAll('text')
        .text(function (d, i) {
          return i % nth === 0 ? self.xAxisFormatter(d) : '';
        });
    };

    XAxis.prototype.resizeAxisLayoutForLabels = function (selection) {
      var self = this;
      var visEl = $(self.el);
      var div;
      var svg;
      var tick;
      var chartwrap;
      var titlespace;
      var xwrapper;
      var xdiv;
      var xdivwrapper;
      var yspacerblock;
      var ratio;
      var flex;
      var chartToXaxis;
      var dataType = selection[0][0].__data__.rows ? 'rows' : 'columns';

      var rotScale = d3.scale.linear()
        .domain([0.12, 0.3, 0.7, 2.1])
        .range([4.3, 13, 27, 102]);

      var flatScale = d3.scale.linear()
        .domain([2.2, 14.5])
        .range([1.2, 11]);

      selection.each(function () {

        div = d3.select(this);
        svg = div.select('svg');
        tick = svg.select('.tick');

        if (dataType === 'rows') {
          chartwrap =  visEl.find('.chart-wrapper-row');
          titlespace = 10;
        } else {
          chartwrap =  visEl.find('.chart-wrapper-column');
          titlespace = 28;
        }
        xwrapper = visEl.find('.x-axis-wrapper');
        xdiv = visEl.find('.x-axis-div');
        xdivwrapper = visEl.find('.x-axis-div-wrapper');
        yspacerblock = visEl.find('.y-axis-spacer-block');
        if (!self._attr.isRotated) {
          // flat labels
          ratio = flatScale(1800 / chartwrap.height());
          xdivwrapper.css('flex', flex + ' 1');
          //console.log('FLAT:', ratio);
          //console.log(chartwrap.height());
        } else {
          // rotated labels
          ratio = rotScale((titlespace + tick.node().getBBox().height) / chartwrap.height());
          div.style('height', 2 + tick.node().getBBox().height + 'px');
          svg.attr('height', 2 + tick.node().getBBox().height + 'px');
          xdivwrapper.css('min-height', tick.node().getBBox().height);
          //console.log('ROT:', ratio);
          //console.log((titlespace + tick.node().getBBox().height) / chartwrap.height());
        }

        flex = ratio.toFixed(1);
        xwrapper.css('flex', flex + ' 1');
        xdiv.css('flex', flex + ' 1');
        yspacerblock.css('flex', flex + ' 1');
        //console.log('flex:', flex);

      });

    };

    return XAxis;
  };
});
