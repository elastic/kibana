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
      this._attr = _.defaults(args._attr || {}, {
        // isDiscover: false,
        //isRotated: true
      });
    }

    _(XAxis.prototype).extend(ErrorHandler.prototype);

    // Render the x axis
    XAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.x-axis-div').call(this.draw());
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
      var maxXValue = d3.max(xValues);
      var timeInterval = ordered.interval;
      // Take the min of the xValues or the min date sent on the ordered object
      var minDate = Math.min(d3.min(xValues), ordered.min);
      // Take the max of the xValues or the max date that sent on the ordered object
      var maxDate = +maxXValue <= ordered.max ?
        this.calculateMaxDate(ordered.max, +maxXValue, timeInterval) : +maxXValue + timeInterval;

      // Add the domain to the scale
      scale.domain([minDate, maxDate]);

      return scale;
    };

    // Returns an accurate maxDate
    XAxis.prototype.calculateMaxDate = function (orderedDate, maxXValue, interval) {
      /*
       * Elasticsearch returns bucketed data.
       *
       * Buckets have a beginning (the start time), an end (the end time),
       * and an interval, the width of the bar minus padding.
       *
       * We need to create an x axis that ends at the end (or end time) of the
       * last bucket.
       *
       * The time stamp values from the maxXValue represent the beginning
       * of each bucket. We cannot guarantee that the values passed from
       * the ordered.max field represents the end of a bucket.
       *
       * So, if we were to render either as the cutoff date, then the last bar
       * on the far right side of the axis may be partially cut off.
       * Therefore, we need to calculate the end time of the last bucket.
       */

      // Difference between the ordered.max value and the max x value
      var diff = orderedDate - maxXValue;

      // if diff is smaller than the interval, but not zero, add the missing
      // percentage of the interval back to the ordered.max date
      if (diff !== 0 && diff < interval) {
        // calculates the appropriate end time
        return +orderedDate + ((1 - diff / interval) * interval);
      }

      // if diff is > than the interval or equals 0 return the ordered.max value
      return orderedDate;
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

    // Returns a function that renders the x axis
    XAxis.prototype.draw = function () {
      var self = this;
      var margin = this._attr.margin;
      var div;
      var width;
      var height;
      var svg;
      this._attr.isRotated = false;

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

        selection.call(self.filterOrRotate());

      };
    };

    // Returns a function that evaluates scale type and applies 
    // filters tick labels on time scales
    // rotates and truncates labels on nominal/ordinal scales
    XAxis.prototype.filterOrRotate = function () {
      var self = this;
      var ordered = self.ordered;
      var axis;
      var labels;

      return function (selection) {
        selection.each(function () {
          axis = d3.select(this);
          labels = axis.selectAll('.tick text');
          
          if (!self.ordered) {
            // nominal/ordinal scale
            axis.call(self.rotateAxisLabels());
            axis.call(self.truncateLabels(100));
          } else {
            // time scale
            axis.call(self.filterAxisLabels());
          }
        });

        selection.call(self.resizeAxisLayoutForLabels());
      };
    };

    // Filter out text labels by width and position on axis
    XAxis.prototype.filterAxisLabels = function () {
      var self = this;
      var startX = 0;
      var maxW = $('.x-axis-div').width();
      var par;
      var myX;
      var myWidth;
      var halfWidth;

      return function (selection) {
        selection.selectAll('.tick text')
          .text(function (d, i) {
            par = d3.select(this.parentNode).node();
            myX = +self.xScale(d).toFixed(1);
            myWidth = +par.getBBox().width.toFixed(1);
            halfWidth = +((par.getBBox().width / 2).toFixed(1));

            // trims labels that would overlap each other 
            // or extend past left or right edges
            // if prev label pos (or 0) + half of label width is < label pos
            // and label pos + half width  is not > width of axis
            if ((startX + halfWidth) < myX && maxW > (myX + halfWidth)) {
              startX = myX + halfWidth;
              return self.xAxisFormatter(d);
            } else {
              d3.select(this.parentNode).select('line').remove();
              return '';
            }
          });
      };
    };

    // Rotate the axis tick labels within selection
    XAxis.prototype.rotateAxisLabels = function () {
      this._attr.isRotated = true;
      return function (selection) {
        selection.selectAll('.tick text')
          .style('text-anchor', 'end')
          .attr('dx', '-.8em')
          .attr('dy', '-.60em')
          .attr('transform', function () {
            return 'rotate(-90)';
          });
      };
    };

    // Returns a function that truncates tick labels
    XAxis.prototype.truncateLabels = function (size) {
      var self = this;
      var labels;
      var node;
      var str;
      var n;
      var maxWidth;
      var maxLength;
      var pixPerChar;
      var endChar;

      return function (selection) {
        
        // get label maxWidth
        labels = selection.selectAll('.tick text');
        maxWidth = 0;
        maxLength = 0;
        labels.each(function () {
          node = d3.select(this).node();
          n = node.innerHTML.length;
          maxWidth = _.max([maxWidth, node.getComputedTextLength() * 0.9]);
          maxLength = _.max([maxLength, n]);
        });
        pixPerChar = maxWidth / maxLength;

        // truncate str
        selection.selectAll('.tick text')
          .text(function (d) {
            str = self.xAxisFormatter(d);
            if (maxWidth > size) {
              endChar = 0;
              if (Math.floor((size / pixPerChar) - 4) >= 4) {
                endChar = Math.floor((size / pixPerChar) - 4);
                while (str[endChar - 1] === ' ' || str[endChar - 1] === '-' || str[endChar - 1] === ',') {
                  endChar = endChar - 1;
                }
              }
              str = str.substr(0, endChar) + '...';
              return str;
            }
            return str;
          });
      };
    };

    // Returns a function that resizes layout divs and 
    // adds css flexbox values to fit axis labels
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

    // Returns flexbox css value using linear scales
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
        //console.log('flat', +ratio.toFixed(1), 35 * (titleSpace + tickHt) / chartHt);
        
      } else {
        // rotated labels
        ratio = rotScale((titleSpace + tickHt) / chartHt);
        //console.log('rotated', +ratio.toFixed(1), (titleSpace + tickHt) / chartHt);
        
      }
      return ratio.toFixed(1);
    };

    return XAxis;
  };
});
