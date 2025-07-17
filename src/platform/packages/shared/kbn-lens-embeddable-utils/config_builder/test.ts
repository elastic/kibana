import type { MetricState } from "./schema";

const test: MetricState = {
  type: 'metric',
  dataset: {
    type: 'index',
    index: 'test',
    time_field: 'test'
  },
  metric: {
    operation: 'count',

  },
  secondary_metric: {
    operation: 'min',
    field: 'test',
  },
  ignore_global_filters: true,
  samplings: 1,
}