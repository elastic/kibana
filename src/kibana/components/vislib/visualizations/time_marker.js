define(function (require) {
  var datemath = require('utils/datemath');

  return function TimeMarkerFactory(d3) {
    function TimeMarker(times, xScale, height) {
      if (!(this instanceof TimeMarker)) {
        return new TimeMarker(times, xScale, height);
      }
      var currentTimeArr = [new Date().getTime()];

      this.xScale = xScale;
      this.height = height;
      this.lineClass = 'time-marker';
      this.stroke = 'blue';
      this.strokeWidth = 2;
      this.times = (times.length) ? times.map(function (dateMathString) {
        return datemath.parse(dateMathString);
      }) : currentTimeArr;
    }

    TimeMarker.prototype._isTimeBasedChart = function (selection) {
      var data = selection.data();
      return data.every(function (datum) {
        return (datum.ordered && datum.ordered.date);
      });
    };

    TimeMarker.prototype.render = function (selection) {
      var self = this;

      // return if not time based chart
      if (!self._isTimeBasedChart(selection)) return;

      selection.each(function () {
        d3.select(this).selectAll('time-marker')
          .data(self.times)
          .enter().append('line')
          .attr('class', self.lineClass)
          .attr('x1', function (d) {
            return self.xScale(d);
          })
          .attr('x2', function (d) {
            return self.xScale(d);
          })
          .attr('y1', self.height)
          .attr('y2', self.xScale.range()[0])
          .attr('stroke', self.stroke)
          .attr('stroke-width', self.strokeWidth);
      });
    };

    TimeMarker.prototype.get = function (field) {
      return this[field] ? this[field] : undefined;
    };

    TimeMarker.prototype.set = function (field, val) {
      if (this[field]) this[field] = val;
    };

    return TimeMarker;
  };
});
