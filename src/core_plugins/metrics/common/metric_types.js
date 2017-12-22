export const metricTypes = ['gauge', 'table', 'metric', 'top_n'];

export function isMetric(panelType) {
  return metricTypes.includes(panelType);
}
