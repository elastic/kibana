/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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

