import buildRequestBody from './table/build_request_body';
import handleErrorResponse from './handle_error_response';
import { getFieldCardinality }  from './get_field_cardinality';
import { get, times, sortBy } from 'lodash';
import processBucket from './table/process_bucket';
export async function getTableData(req, panel) {
  const config = req.server.config();
  try {
    const totalItems = await getFieldCardinality(req, panel);
    if (totalItems < 1) {
      return { type: 'table', series: [], meta: { request: null, response: null } };
    }
    const tableTotalSize = config.get('metrics.tableTotalSize');
    const total = totalItems < tableTotalSize ? totalItems : tableTotalSize;
    const totalPartitions = Math.ceil(total / config.get('metrics.tablePartitionSize'));
    const bodies = [];
    times(totalPartitions, partition => {
      bodies.push({ index: panel.index_pattern });
      bodies.push(buildRequestBody(req, panel, partition, totalPartitions));
    });
    const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
    const response = await callWithRequest(req, 'msearch', { body: bodies });
    const buckets = response.responses.reduce((acc, resp) => {
      return acc.concat(get(resp, 'aggregations.pivot.buckets', []));
    }, []).map(processBucket(panel));
    return { type: 'table', series: sortBy(buckets, 'key'), meta: { request: bodies, response } };
  } catch (err) {
    if (err.body) {
      err.response = err.body;
      return { type: 'table', ...handleErrorResponse(panel)(err) };
    } else {
      throw err;
    }
  }
}
