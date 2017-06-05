import uuid from 'node-uuid';
import _ from 'lodash';
export default source => {
  const series = _.cloneDeep(source);
  series.id = uuid.v1();
  series.metrics.forEach((metric) => {
    const id = uuid.v1();
    const metricId = metric.id;
    metric.id = id;
    if (series.terms_order_by === metricId) series.terms_order_by = id;
    series.metrics.filter(r => r.field === metricId).forEach(r => r.field = id);
    series.metrics.filter(r => r.type === 'calculation' &&
      r.variables.some(v => v.field === metricId))
      .forEach(r => {
        r.variables.filter(v => v.field === metricId).forEach(v => {
          v.id = uuid.v1();
          v.field = id;
        });
      });
  });
  return series;
};
