import buildRequestBody from './table/build_request_body';
import { get } from 'lodash';
import processBucket from './table/process_bucket';
export async function getTableData(req, panel) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  const params = {
    index: panel.index_pattern,
    body: buildRequestBody(req, panel)
  };
  const resp = await callWithRequest(req, 'search', params);
  if (resp.error) {
    const err = new Error(resp.error.type);
    err.response = JSON.stringify(resp);
    console.log(err);
    throw err;
  }
  const buckets = get(resp, 'aggregations.pivot.buckets', []);
  return { type: 'table', series: buckets.map(processBucket(panel)) };
}
