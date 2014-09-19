define(function (require) {
  return function XAxisFactory(d3, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var ErrorHandler = Private(require('components/vislib/lib/_error_handler'));
    var ChartTitle = Private(require('components/vislib/lib/chart_title'));

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
      this._attr = _.defaults(args._attr || {});
    }

    _(XAxis.prototype).extend(ErrorHandler.prototype);

    // Render the x axis
    XAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.x-axis-div').call(this.draw());
    };

    // Get the d3 scale
    // if time, return time scale
    // return d3 ordinal scale for nominal data
    XAxis.prototype.getScale = function (ordered) {
      if (ordered && ordered.date) {
        return d3.time.scale();
      }
      return d3.scale.ordinal();
    };

    // Add domain to the scale
    // if time, return a time domain
    // Calculate the min date, max date, and time interval;
    // return a nominal domain, i.e. array of x values
    XAxis.prototype.getDomain = function (scale, ordered) {
      if (ordered && ordered.date) {
        return this.getTimeDomain(scale, ordered);
      }
      return this.getOrdinalDomain(scale, this.xValues);
    };

    // Returns a time domain
    XAxis.prototype.getTimeDomain = function (scale, ordered) {
      return scale.domain([ordered.min, ordered.max]);
    };

    // Return a nominal(d3 ordinal) domain
    XAxis.prototype.getOrdinalDomain = function (scale, xValues) {
      
      return scale.domain(xValues);
    };

    // Return the range for the x axis scale
    // if time, return a normal range
    // if nominal, return rangeBands with a default (0.1) spacer specified
    XAxis.prototype.getRange = function (scale, ordered, width) {
      if (ordered && ordered.date) {
        return scale.range([0, width]);
      }
      return scale.rangeBands([0, width], 0.1);
    };

    // Return the x axis scale
    XAxis.prototype.getXScale = function (ordered, width) {
      var scale = this.getScale(ordered);
      var domain = this.getDomain(scale, ordered);
      var xScale = this.getRange(domain, ordered, width);

      return xScale;
    };

    // Create the d3 xAxis function
    // save a reference to the xScale
    // Scale should never === `NaN`
    XAxis.prototype.getXAxis = function (width) {
      this.xScale = this.getXScale(this.ordered, width);

      if (!this.xScale || _.isNaN(this.xScale)) {
        throw new Error('xScale is ' + this.xScale);
      }

      this.xAxis = d3.svg.axis()
        .scale(this.xScale)
        .ticks(10)
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
      var parentWidth;
      var n;
      this._attr.isRotated = false;

      return function (selection) {
        n = selection[0].length;
        parentWidth = $(self.el).find('.x-axis-div-wrapper').width();

        selection.each(function () {

          // Validate that width and height are not 0 or `NaN`
          // return access to xAxis variable on the object
          // append svg and x axis
          div = d3.select(this);
          width = parentWidth / n;
          height = $(this).height();

          self.validateWidthandHeight(width, height);

          self.getXAxis(width);

          svg = div.append('svg')
            .attr('width', width)
            .attr('height', height);

          svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,0)')
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
            axis.call(self.rotateAxisLabels());
          } else {
            axis.call(self.filterAxisLabels());
          }
        });

        selection.call(self.fitTitles());
        
        self.updateSpacer();

      };
    };

    // Rotate the axis tick labels within selection
    XAxis.prototype.rotateAxisLabels = function () {
      var self = this;
      var text;
      var maxWidth = self.xScale.rangeBand();
      var textWidth = 0;
      var xAxisPadding = 15;
      var svg;
      var maxSize = 120;
      self._attr.isRotated = false;
      
      return function test(selection) {

        text = selection.selectAll('.tick text');
        
        text.each(function textWidths() {
          if (d3.select(this).node().getBBox().width > maxWidth) {
            self._attr.isRotated = true;
            textWidth = _.max([textWidth, (d3.select(this).node().getBBox().width + xAxisPadding)]);
          }
        });
          
        if (self._attr.isRotated) {
          text
            .text(function truncate() {
              return self.truncateLabel(this, maxSize);
            })
            .style('text-anchor', 'end')
            .attr('dx', '-.8em')
            .attr('dy', '-.60em')
            .attr('transform', function rotate() {
              return 'rotate(-90)';
            });
          selection.select('svg').attr('height', maxSize);
        }

        // need to add mouseover to show tooltip on truncated labels

      };
    };

    // Returns a string that is truncated to fit size
    XAxis.prototype.truncateLabel = function (text, size) {
      var node = d3.select(text).node();
      var str = node.innerHTML;
      var width = node.getBBox().width;
      var chars = str.length;
      var pxPerChar = width / chars;
      var endChar = 0;
      var ellipsesPad = 4;

      if (width > size) {
        endChar = Math.floor((size / pxPerChar) - ellipsesPad);
        while (str[endChar - 1] === ' ' || str[endChar - 1] === '-' || str[endChar - 1] === ',') {
          endChar = endChar - 1;
        }
        str = str.substr(0, endChar) + '...';
      }
      return str;
    };

    // Filter out text labels by width and position on axis
    // trims labels that would overlap each other 
    // or extend past left or right edges
    // if prev label pos (or 0) + half of label width is < label pos
    // and label pos + half width  is not > width of axis
    XAxis.prototype.filterAxisLabels = function () {
      var self = this;
      var startX = 0;
      var maxW;
      var par;
      var myX;
      var myWidth;
      var halfWidth;

      return function (selection) {
        selection.selectAll('.tick text')
          .text(function (d, i) {
            par = d3.select(this.parentNode).node();
            myX = self.xScale(d);
            myWidth = par.getBBox().width;
            halfWidth = par.getBBox().width / 2;
            maxW = $(self.el).find('.x-axis-div').width();
            
            if ((startX + halfWidth) < myX && maxW > (myX + halfWidth)) {
              startX = myX + halfWidth;
              return self.xAxisFormatter(d);
            } else {
              d3.select(this.parentNode).remove();
            }
          });
      };
    };

    // Returns a function that adjusts axis titles and
    // chart title transforms to fit axis label divs.
    // Sets transform of x-axis-title to fit .x-axis-title div width
    // if x-axis-chart-titles, set transform of x-axis-chart-titles
    // to fit .chart-title div width
    XAxis.prototype.fitTitles = function () {
      var self = this;
      var visEls = $('.vis-wrapper');
      var visEl;
      var xAxisTitle;
      var xAxisChartTitle;
      var titleWidth;
      var text;
      var titles;

      return function () {
        visEls.each(function () {
          visEl = this;
          xAxisTitle = $(this).find('.x-axis-title');
          titleWidth = xAxisTitle.width();

          text = d3.select(this).select('.x-axis-title')
            .select('svg')
            .attr('width', titleWidth)
            .select('text')
            .attr('transform', 'translate(' + (titleWidth / 2) + ',11)');

          if ($(this).find('.x-axis-chart-title').length) {
            xAxisChartTitle = $(this).find('.x-axis-chart-title');
            titleWidth = xAxisChartTitle.find('.chart-title').width();
            
            titles = d3.select(this).select('.x-axis-chart-title').selectAll('.chart-title');
            titles.each(function () {
              text = d3.select(this)
                .select('svg')
                .attr('width', titleWidth)
                .select('text')
                .attr('transform', 'translate(' + (titleWidth / 2) + ',11)');
            });
          }
          
        });
        
      };
    };

    // Appends div to make .y-axis-spacer-block
    // match height of .x-axis-wrapper
    XAxis.prototype.updateSpacer = function () {
      
      var selection = d3.selectAll('.vis-wrapper');
      var $selection = $('.vis-wrapper');
      
      selection.each(function () {
        var vis = d3.select(this);
        var $vis = $(this);
        var newHeight = $vis.find('.x-axis-wrapper').height();
        if (vis.select('.inner-spacer-block').node() === null) {
          vis.select('.y-axis-spacer-block')
            .append('div')
            .attr('class', 'inner-spacer-block');
        }
        vis.select('.inner-spacer-block')
          .style('height', newHeight + 'px');
      });
      
    };

    return XAxis;
  };
});
