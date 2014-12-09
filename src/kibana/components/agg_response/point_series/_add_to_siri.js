define(function (require) {
  return function PointSeriesAddToSiri() {
    return function addToSiri(series, point, id, label) {
      id = id == null ? '' : id + '';

      if (series[id]) {
        series[id].values.push(point);
        return;
      }

      series[id] = {
        label: label == null ? id : label,
        values: [point]
      };
    };
  };
});