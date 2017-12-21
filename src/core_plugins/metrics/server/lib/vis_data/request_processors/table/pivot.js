import { set } from 'lodash';
export default function pivot(req, panel, partition, numPartitions) {
  const config = req.server.config();
  return next => doc => {
    if (panel.pivot_id) {
      const size = config.get('metrics.tablePartitionSize');
      set(doc, 'aggs.pivot.terms.field', panel.pivot_id);
      set(doc, 'aggs.pivot.terms.size', size);
      set(doc, 'aggs.pivot.terms.include', { partition, num_partitions: numPartitions });
    } else {
      set(doc, 'aggs.pivot.filter.match_all', {});
    }
    return next(doc);
  };
}
