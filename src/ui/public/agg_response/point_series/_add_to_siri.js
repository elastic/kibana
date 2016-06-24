export default function PointSeriesAddToSiri() {
  return function addToSiri(series, point, id, label, onSecondaryYAxis) {
    id = id == null ? '' : id + '';

    if (series.has(id)) {
      series.get(id).values.push(point);
      series.get(id).onSecondaryYAxis = onSecondaryYAxis || false;
      return;
    }

    series.set(id, {
      label: label == null ? id : label,
      values: [point],
      onSecondaryYAxis: onSecondaryYAxis
    });
  };
};
