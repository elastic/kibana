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

import _ from 'lodash';
import { IRouter } from 'kibana/server';
import { LoadFunctions } from '../lib/load_functions';

export function functionsRoute(router: IRouter, { functions }: { functions: LoadFunctions }) {
  router.get(
    {
      path: '/api/timelion/functions',
      validate: false,
    },
    async (context, request, response) => {
      const functionArray = _.map(functions, function (val, key) {
        // TODO: This won't work on frozen objects, it should be removed when everything is converted to datasources and chainables
        return _.extend({}, val, { name: key });
      });

      return response.ok({ body: _.sortBy(functionArray, 'name') });
    }
  );
}
