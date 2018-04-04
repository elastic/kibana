import getTimerange from './helpers/get_timerange';
import { get } from 'lodash';
import getIntervalAndTimefield from './get_interval_and_timefield';
export async function getFieldCardinality(req, panel) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  const { timeField } = getIntervalAndTimefield(panel);
  const { from, to } = getTimerange(req);

  if (!panel.pivot_id) return 0;

  const body = {
    size: 0,
    query: {
      bool: {
        must: [
          {
            range: {
              [timeField]: {
                gte: from.valueOf(),
                lte: to.valueOf(),
                format: 'epoch_millis',
              }
            }
          }
        ]
      }
    },
    aggs: {
      nodeCount: {
        cardinality: { field: panel.pivot_id }
      }
    }
  };

  const globalFilters = req.payload.filters;
  if (globalFilters && !panel.ignore_global_filter) {
    body.query.bool.must = body.query.bool.must.concat(globalFilters);
  }

  if (panel.filter) {
    body.query.bool.must.push({
      query_string: {
        query: panel.filter,
        analyze_wildcard: true
      }
    });
  }

  const resp = await callWithRequest(req, 'search', {
    index: panel.indexPattern,
    body
  });

  return get(resp, 'aggregations.nodeCount.value');
}

