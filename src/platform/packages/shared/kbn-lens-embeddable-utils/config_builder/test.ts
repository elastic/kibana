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
  breakdown_by: {
    operation: 'terms',
    fields: ['test'],
    size: 5,
    increase_accuracy: true,
    collapse_by: 'avg',
  },
  ignore_global_filters: true,
  samplings: 1,
}