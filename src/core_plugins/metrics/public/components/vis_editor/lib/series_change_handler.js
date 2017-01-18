import _ from 'lodash';
import newMetricAggFn from 'plugins/metrics/components/vis_editor/lib/new_metric_agg_fn';
import { isBasicAgg } from 'plugins/metrics/components/vis_editor/lib/agg_lookup';
import {
  handleAdd,
  handleChange
} from 'plugins/metrics/lib/collection_actions';
export default (props, items) => doc => {
  // If we only have one sibling and the user changes to a pipeline
  // agg we are going to add the pipeline instead of changing the
  // current item.
  if (items.length === 1 && !isBasicAgg(doc)) {
    handleAdd.call(null, props, () => {
      const metric = newMetricAggFn();
      metric.type = doc.type;
      const incompatPipelines = ['calculation', 'series_agg'];
      if (!_.contains(incompatPipelines, doc.type)) metric.field = doc.id;
      return metric;
    });
  } else {
    handleChange.call(null, props, doc);
  }
};
