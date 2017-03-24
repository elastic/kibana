import uuid from 'node-uuid';
import _ from 'lodash';
import newMetricAggFn from './new_metric_agg_fn';
export default (obj = {}) => {
  return _.assign({
    id: uuid.v1(),
    color: '#68BC00',
    split_mode: 'everything',
    metrics: [ newMetricAggFn() ],
    seperate_axis: 0,
    axis_position: 'right',
    formatter: 'number',
    chart_type: 'line',
    line_width: 1,
    point_size: 1,
    fill: 0.5,
    stacked: 'none'
  }, obj);
};
