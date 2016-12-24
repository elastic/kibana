export default function PointSeriesAddToSiri() {
  return function addToSiri(series, point, id, label, agg) {
    id = id == null ? '' : id + '';

    if (series.has(id)) {
      series.get(id).values.push(point);
      return;
    }

    series.set(id, {
      label: label == null ? id : label,
      aggLabel: agg.type.makeLabel(agg),
      aggId: agg.parentId ? agg.parentId : agg.id,
      count: 0,
      values: [point]
    });
  };
}
