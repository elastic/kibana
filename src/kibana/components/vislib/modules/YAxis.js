define(function (require) {
  return function YAxisFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');

    var split = Private(require('components/vislib/components/YAxis/_split'));

    function YAxis(el, yMax, height, margin) {
      this.el = el;
      this.yMax = yMax;
      this.margin = margin;
      this.height = height - margin.top - margin.bottom;
    }

    YAxis.prototype.render = function () {
      d3.select(this.el).selectAll('.y-axis-div').call(this.appendSVG());
    };

    YAxis.prototype.getYScale = function () {
      this.yScale = d3.scale.linear()
        .domain([0, this.yMax])
        .range([this.height, 0])
        .nice();
    };

    YAxis.prototype.getYAxis = function () {
      this.getYScale();

      this.yAxis = d3.svg.axis()
        .scale(this.yScale)
        .tickFormat(d3.format('s'))
        .orient('left');
    };

    YAxis.prototype.appendSVG = function () {
      var self = this;
      var div;
      var width;
      var height;
      var svg;
      var bbox;
      var tickN;

      this.getYAxis();

      return function (selection) {
        selection.each(function () {
          div = d3.select(this);
          width = $(this).width();
          height = $(this).height() - self.margin.top - self.margin.bottom;

          svg = div.append('svg')
            .attr('width', width)
            .attr('height', height + self.margin.top + self.margin.bottom);

          svg.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + width * 0.95 + ',' + self.margin.top + ')')
            .call(self.yAxis);

          // update layout divs to tick lengths
          // self.updateLayoutForRotatedLabels(div, self.getMaxLabelLength(selection));

        });
      };
    };

    YAxis.prototype.getMaxLabelLength = function (selection) {
      var svg = selection.select('svg');
      var labels = selection.selectAll('.tick text');
      var param;
      var arr = [];
      var length;
      var spacer;
      
      // get max tick label length
      _.forEach(labels[0], function (n) {
        arr.push(n.getBBox().width);
      });
      console.log(arr, _.max(arr));
      return length = _.max(arr);
    };

    YAxis.prototype.updateLayoutForRotatedLabels = function (selection, length) {
      var self = this;

      var svg = selection.select('svg');
      var spacer;
      var tickspace = 14;
      length += tickspace;

      // if rows, space for chart title
      // if cols, space for chart title + axis label
      spacer = length + tickspace + 18;
      if (this.el.__data__.rows) {
        spacer = length + 32;
      }

      // set widths of svg, x-axis-div and x-axis-div-wrapper to fit ticklabels
      svg.attr('width', length + 6);
      //$('.y-axis-div-wrapper').width(length + tickspace);
      $('.y-axis-div').width(length);
      //$('.y-axis-col-wrapper').width(length);
      //$('.y-axis-col').width(length + tickspace);
      d3.select('.y.axis').attr('transform', 'translate(' + (length + 2) + ',' + self.margin.top + ')');
      
      // set widths of y-axis-spacer-block and x-axis-wrapper to fit resized x axis      
      $('.y-axis-spacer-block').width(spacer);
      $('.y-axis-col-wrapper').width(spacer);
      $('.y-axis-col').width(spacer);
      
    };

    return YAxis;
  };
});
