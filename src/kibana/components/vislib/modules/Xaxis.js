define(function (require) {
  return function XAxisFactory(d3, Private) {
    var $ = require('jquery');

    function XAxis(args) {
      this.el = args.el;
      this.data = args.data;
      this._attr = args.attr;
      this.width = args.width - this._attr.margin.left - this._attr.margin.right;
    }

    XAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.x-axis-div').call(this.draw());
    };

    XAxis.prototype.getScale = function () {
      var ordered = this.data.get('ordered');

      // Tests whether the xValues are dates
      if (ordered && ordered.date) {
        return d3.time.scale();
      }
      return d3.scale.ordinal();
    };

    XAxis.prototype.getDomain = function () {
      var scale = this.getScale();
      var ordered = this.data.get('ordered');
      var keys = this.data.xValues();
      var minDate;
      var maxDate;
      var timeInterval;
      var spacingPercentage;

      if (ordered && ordered.date) {
        // Calculate the min date, max date, and time interval;
        minDate = Math.min(d3.min(keys), ordered.min);
        maxDate = d3.max(keys);
        timeInterval = ordered.interval;
        spacingPercentage = 0.25;

        scale.domain([minDate, maxDate + timeInterval * (1 - spacingPercentage)]);
        return scale;
      }
      scale.domain(keys);
      return scale;
    };

    XAxis.prototype.getRange = function () {
      var ordered = this.data.get('ordered');
      var scale = this.getDomain();
      if (ordered) {
        scale.range([0, this.width]);
        return scale;
      }
      scale.rangeBands([0, this.width], 0.1);
      return scale;
    };

    XAxis.prototype.getXScale = function () {
      return this.getRange();
    };

    XAxis.prototype.getXAxis = function () {
      var xAxisFormatter = this.data.get('xAxisFormatter');
      this.xScale = this.getXScale();

      this.xAxis = d3.svg.axis()
        .scale(this.xScale)
        .tickFormat(xAxisFormatter)
        .orient('bottom');
    };

    XAxis.prototype.draw = function () {
      var self = this;
      var div;
      var width;
      var height;
      var svg;
      var bbox;
      var tickN;
      var ticksLength;
      var rotatedTicksLength;
      var percentage;
      var isRotated = false;
      var ratio;
      var oClass;
      var iClass;
      var spacerht;
      var isDiscover = false;
      
      if ($('.discover-timechart').length) isDiscover = true;

      this.getXAxis();

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          width = $(this).width() - self._attr.margin.left - self._attr.margin.right;
          height = $(this).height();

          svg = div.append('svg')
            .attr('width', width + self._attr.margin.left + self._attr.margin.right)
            .attr('height', height);

          var xaxis = svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(' + self._attr.margin.left + ',0)')
            .call(self.xAxis);

          bbox = selection.selectAll('.tick text').node().getBBox();
          tickN = selection.selectAll('.tick text')[0].length;
          ticksLength = bbox.width * 1.05 * tickN;
          rotatedTicksLength = bbox.width * 1.05 * tickN;
          
          if (!isDiscover) {
            rotatedTicksLength = bbox.height * 1.05 * tickN;
            // check widths to apply rotate
            if (ticksLength > width) {
              self.rotateAxisLabels(selection);
              isRotated = true;
            }
          }

          // check widths to apply filter
          percentage = Math.floor(rotatedTicksLength / width) + 1;
          if (rotatedTicksLength > width) {
            self.filterAxisLabels(selection, percentage);
          }

          // set heights of x-axis-div and x-axis-div-wrapper to fit ticklabels
          var newheight = xaxis.node().getBBox();
          $('.x-axis-div').height(newheight.height);
          $('.x-axis-div-wrapper').height(newheight.height);
          svg.attr('height', newheight.height);

          $('.x-axis-wrapper').height(newheight.height + 20);
          $('.y-axis-spacer-block').height(newheight.height + 20);

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
      return selection.selectAll('text')
        .text(function (d, i) {
          return i % nth === 0 ? self.xAxisFormatter(d) : '';
        });
    };

    return XAxis;
  };
});
