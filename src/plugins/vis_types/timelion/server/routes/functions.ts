/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { IRouter } from '@kbn/core/server';
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
