define(function (require) {
  return function PointSeriesAddToSiri() {
    return function addToSiri(series, point, id, label, onSecondaryYAxis) {
      id = id == null ? '' : id + '';

      if (series[id]) {
        series[id].values.push(point);
        series[id].onSecondaryYAxis = onSecondaryYAxis;
        return;
      }

      series[id] = {
        label: label == null ? id : label,
        values: [point],
        onSecondaryYAxis: onSecondaryYAxis
      };
    };
  };
});
