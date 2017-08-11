import getRequestParams from './get_request_params';
import handleResponseBody from './handle_response_body';
import handleErrorResponse from '../handle_error_response';
import getLastValue from '../../../../common/get_last_value';
import _ from 'lodash';
import regression from 'regression';
export function getColumnData(req, panel, entities, client) {
  const elasticsearch = _.get(req, 'server.plugins.elasticsearch');
  if (elasticsearch) {
    const { callWithRequest } = elasticsearch.getCluster('data');
    if (!client) {
      client = callWithRequest.bind(null, req);
    }
  }
  const params = {
    body: getRequestParams(req, panel, entities)
  };
  return client('msearch', params)
    .then(resp => {
      const handler = handleResponseBody(panel);
      return entities.map((entity, index) => {
        entity.data = {};
        handler(resp.responses[index]).forEach(row => {
          const linearRegression = regression('linear', row.data);
          entity.data[row.id] = {
            last: getLastValue(row.data),
            slope: linearRegression.equation[0],
            yIntercept: linearRegression.equation[1],
            label: row.label
          };
        });
        return entity;
      });
    })
    .catch(handleErrorResponse(panel));
}

