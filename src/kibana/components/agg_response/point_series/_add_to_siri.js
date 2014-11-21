define(function (require) {
  return function PointSeriesAddToSiri() {
    return function addToSiri(series, point, id) {
      id = id || '';

      if (series[id]) {
        series[id].values.push(point);
        return;
      }

      series[id] = {
        label: id,
        values: [point]
      };
    };
  };
});