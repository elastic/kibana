define(function (require) {
  return function XAxisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));

    /*
     * Add an x axis to the visualization
     * aruments =>
     *  el => reference to DOM element
     *  xValues => array of x values from the dataset
     *  ordered => data object that is defined when the data is ordered
     *  xAxisFormatter => function to formatx axis tick values
     *  _attr => visualization attributes
     */
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

    _(XAxis.prototype).extend(ErrorHandler.prototype);

    // Render the x axis
    XAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.x-axis-div').call(this.draw());
      d3.select(this.el).selectAll('.x-axis-div').call(this.checkTickLabels());
      d3.select(this.el).selectAll('.x-axis-div').call(this.resizeAxisLayoutForLabels());
    };

    // Get the d3 scale
    XAxis.prototype.getScale = function (ordered) {
      // if time, return time scale
      if (ordered && ordered.date) {
        return d3.time.scale();
      }
      // return d3 ordinal scale for nominal data
      return d3.scale.ordinal();
    };

    // Add domain to the scale
    XAxis.prototype.getDomain = function (scale, ordered) {
      // if time, return a time domain
      if (ordered && ordered.date) {
        // Calculate the min date, max date, and time interval;
        return this.getTimeDomain(scale, this.xValues, ordered);
      }
      // return a nominal domain, i.e. array of x values
      return this.getOrdinalDomain(scale, this.xValues);
    };

    // Returns a time domain
    XAxis.prototype.getTimeDomain = function (scale, xValues, ordered) {
      // Should think about replacing and not hard coding
      var spacingPercentage = 0.25;
      var maxXValue = d3.max(xValues);
      var timeInterval = ordered.interval;
      // Take the min of the xValues or the ordered object
      var minDate = Math.min(d3.min(xValues), ordered.min);
      // Take the max of the xValues or the max date that is sent
      var maxDate = +maxXValue <= ordered.max ? ordered.max : +maxXValue + timeInterval;

      // Add the domain to the scale
      scale.domain([minDate, maxDate]);

      return scale;
    };

    // Return a nominal(d3 ordinal) domain
    XAxis.prototype.getOrdinalDomain = function (scale, xValues) {
      return scale.domain(xValues);
    };

    // Return the range for the x axis scale
    XAxis.prototype.getRange = function (scale, ordered, width) {
      // if time, return a normal range
      if (ordered && ordered.date) {
        scale.range([0, width]);
        return scale;
      }
      // if nominal, return rangeBands with a default (0.1) spacer specified
      scale.rangeBands([0, width], 0.1);
      return scale;
    };

    // Return the x axis scale
    XAxis.prototype.getXScale = function (ordered, width) {
      var scale = this.getScale(ordered);
      var domain = this.getDomain(scale, ordered);
      var xScale = this.getRange(domain, ordered, width);

      return xScale;
    };

    // Create the d3 xAxis function
    XAxis.prototype.getXAxis = function (width) {
      this.xAxisFormatter = this.xAxisFormatter;
      // save a reference to the xScale
      this.xScale = this.getXScale(this.ordered, width);

      // Scale should never === `NaN`
      if (!this.xScale || _.isNaN(this.xScale)) {
        throw new Error('xScale is ' + this.xScale);
      }

      // save a reference to the xAxis
      this.xAxis = d3.svg.axis()
        .scale(this.xScale)
        .tickFormat(this.xAxisFormatter)
        .orient('bottom');
    };

    // Return a function that renders the x axis
    XAxis.prototype.draw = function () {
      var self = this;
      var margin = this._attr.margin;
      var div;
      var width;
      var height;
      var svg;

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

          // Validate that the width and height are not 0 or `NaN`
          self.validateWidthandHeight(width, height);

          // Return access to xAxis variable on the object
          self.getXAxis(width);

          // Append svg and x axis
          svg = div.append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height);

          svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(' + margin.left + ',0)')
            .call(self.xAxis);
        });
      };
    };

    // Eval tick label widths to apply rotate and or filter
    XAxis.prototype.checkTickLabels = function () {
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
      
      return function (selection) {

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

          // rotate if any chart subtotal > width
          if (subtotalW > width) {
            rotate = true;
          }
        });

        // do not rotate labels for discover view
        if (!self._attr.isDiscover && rotate) {
          self.rotateAxisLabels(selection);
          self._attr.isRotated = true;
        }
        
        // Filter labels to prevent overlap of text
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
    };

    // Rotate the axis tick labels within selection
    XAxis.prototype.rotateAxisLabels = function (selection) {
      return selection.selectAll('.tick text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '-.60em')
        .attr('transform', function () {
          return 'rotate(-90)';
        });
    };

    // Filter out every nth text label
    XAxis.prototype.filterAxisLabels = function (selection, nth) {
      var self = this;
      return selection.selectAll('text')
        .text(function (d, i) {
          return i % nth === 0 ? self.xAxisFormatter(d) : '';
        });
    };

    // Resize layout divs and flexbox values to fit axis labels
    XAxis.prototype.resizeAxisLayoutForLabels = function () {
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
      var dataType;
      var tickHt;
      var chartHt;

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          svg = div.select('svg');
          tick = svg.select('.tick');
          dataType = this.parentNode.__data__.series ? 'series' : this.parentNode.__data__.rows ? 'rows' : 'columns';

          xwrapper = visEl.find('.x-axis-wrapper');
          xdiv = visEl.find('.x-axis-div');
          xdivwrapper = visEl.find('.x-axis-div-wrapper');
          yspacerblock = visEl.find('.y-axis-spacer-block');

          // define chartwrap and titlespace, for chart title 
          // and axis title based on data type
          if (dataType === 'series') {
            chartwrap =  visEl.find('.chart-wrapper');
            titlespace = 15;
          } else if (dataType === 'rows') {
            chartwrap =  visEl.find('.chart-wrapper-row');
            titlespace = 15;
          } else {
            chartwrap =  visEl.find('.chart-wrapper-column');
            titlespace = 30;
          }

          // should have a tick node
          if (!tick.node()) {
            throw new Error('x-axis tick.node() is undefined');
          }

          tickHt = tick.node().getBBox().height;
          chartHt = chartwrap.height();
          flex = self.getFlexVal(self._attr.isRotated, titlespace, tickHt, chartHt);
          
          // set height of svg, transform to fit axis labels
          svg.attr('height', chartHt);
          xwrapper.css('flex', flex + ' 1');
          xdiv.css('flex', flex + ' 1');
          yspacerblock.css('flex', flex + ' 1');
        });
      };
    };

    // Return flexbox css value using linear scales
    XAxis.prototype.getFlexVal = function (isRotated, titleSpace, tickHt, chartHt) {
      var ratio;

      var rotScale = d3.scale.linear()
        .domain([0.1, 0.5, 2])
        .range([3.3, 22, 70]);

      var flatScale = d3.scale.linear()
        .domain([0.2, 1, 2, 20])
        .range([1.1, 1, 2, 20]);
      
      if (!isRotated) {
        // flat labels
        ratio = flatScale(35 * (titleSpace + tickHt) / chartHt);
        // console.log('flat', +ratio.toFixed(1), 35 * (titleSpace + tickHt) / chartHt);
        
      } else {
        // rotated labels
        ratio = rotScale((titleSpace + tickHt) / chartHt);
        // console.log('rotated', +ratio.toFixed(1), (titleSpace + tickHt) / chartHt);
        
      }
      return ratio.toFixed(1);
    };

    return XAxis;
  };
});
