import buildRequestBody from './table/build_request_body';
import handleErrorResponse from './handle_error_response';
import { get } from 'lodash';
import processBucket from './table/process_bucket';
export async function getTableData(req, panel) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  const params = {
    index: panel.index_pattern,
    body: buildRequestBody(req, panel)
  };
  try {
    const resp = await callWithRequest(req, 'search', params);
    const buckets = get(resp, 'aggregations.pivot.buckets', []);
    return { type: 'table', series: buckets.map(processBucket(panel)) };
  } catch (err) {
    if (err.body) {
      err.response = err.body;
      return { type: 'table', ...handleErrorResponse(panel)(err) };
    }
  }
}
