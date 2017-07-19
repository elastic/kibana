import newSeriesFn from '../components/lib/new_series_fn';
import uuid from 'uuid';
export default () => {
  const id = uuid.v1();
  return {
    id,
    type: 'timeseries',
    series: [
      newSeriesFn()
    ],
    time_field: '@timestamp',
    index_pattern: '*',
    interval: 'auto',
    axis_position: 'left',
    axis_formatter: 'number',
    show_legend: 1
  };
};
