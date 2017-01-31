import getRequestParams from './get_request_params';
import handleResponseBody from './handle_response_body';
import handleErrorResponse from './handle_error_response';
export default function getPanelData(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  return panel => {

    return Promise.all(panel.series.map(series => getRequestParams(req, panel, series)))
      .then((bodies) => {
        const params = {
          body: bodies.reduce((acc, items) => acc.concat(items), [])
        };
        return callWithRequest(req, 'msearch', params);
      })
      .then(resp => {
        const series = resp.responses.map(handleResponseBody(panel));
        return {
          [panel.id]: {
            id: panel.id,
            series: series.reduce((acc, series) => acc.concat(series), [])
          }
        };
      })
      .catch(handleErrorResponse(panel));
  };
}
