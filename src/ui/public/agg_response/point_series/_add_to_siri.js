define(function (require) {
  return function PointSeriesAddToSiri() {
    return function addToSiri(series, point, id, label) {
      id = id == null ? '' : id + '';

      if (series.has(id)) {
        series.get(id).values.push(point);
        return;
      }

      series.set(id, {
        label: label == null ? id : label,
        values: [point]
      });
    };
  };
});
