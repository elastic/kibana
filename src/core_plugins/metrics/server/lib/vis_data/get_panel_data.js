import getRequestParams from './get_request_params';
import handleResponse from './handle_response';
import handleErrorResponse from './handle_error_response';
export default function getPanelData(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  return panel => {
    return Promise.all(panel.series.map(series => getRequestParams(req, panel, series)
      .then(params => {
        return callWithRequest(req, 'msearch', params)
          .then(resp => {
            const result = {};
            result[panel.id] = {
              id: panel.id,
              series: resp.responses
              .map(handleResponse(panel))
              .reduce((acc, data) => {
                return acc.concat(data);
              }, [])
            };
            return result;
          })
          .catch(handleErrorResponse(panel));
      }))).then(resp => {
        const result = {};
        result[panel.id] = {
          id: panel.id,
          series: resp.reduce((acc, item) => acc.concat(item[panel.id].series || []), [])
        };
        return result;
      });
  };
}

