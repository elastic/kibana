define(function () {
  return function TimeMarkerFactory(d3) {
    function TimeMarker(xScale, height) {
      if (!(this instanceof TimeMarker)) {
        return new TimeMarker(xScale, height);
      }

      this.xScale = xScale;
      this.height = height;
      this.lineClass = 'time-marker';
      this.time = new Date().getTime();
      this.stroke = 'blue';
      this.strokeWidth = 2;
    }

    TimeMarker.prototype.render = function (selection) {
      var self = this;

      selection.each(function () {
        var g = d3.select(this).append('line')
          .attr('class', self.lineClass)
          .attr('x1', self.xScale(self.time))
          .attr('x2', self.xScale(self.time))
          .attr('y1', self.height)
          .attr('y2', self.xScale.range()[0])
          .attr('stroke', self.stroke)
          .attr('stroke-width', self.strokeWidth);
      });
    };

    TimeMarker.prototype.get = function (opt) {
      if (this[opt]) return this[opt];
    };

    TimeMarker.prototype.set = function (opt, val) {
      if (this[opt] && this[opt] !== val) this[opt] = val;
    };

    return TimeMarker;
  };
});
