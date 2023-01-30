/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';

import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import { CoreSetup } from '@kbn/core/server';

export const setupOptionsListClusterSettingsRoute = ({ http }: CoreSetup) => {
  const router = http.createRouter();
  router.get(
    {
      path: '/api/kibana/controls/getClusterSettings',
      validate: false,
    },
    async (context, _, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const allowExpensiveQueries = get(
          await esClient.cluster.getSettings({
            include_defaults: true,
            filter_path: '**.allow_expensive_queries',
          }),
          'transient.search.allow_expensive_queries'
        );
        return response.ok({
          body: {
            // by default, the allowExpensiveQueries cluster setting is undefined; so, we need to assume
            // it's true in that case, since that's the way other applications (such as the dashboard listing
            // page) handle this.
            allowExpensiveQueries: allowExpensiveQueries ? allowExpensiveQueries === 'true' : true,
          },
        });
      } catch (e) {
        const kbnErr = getKbnServerError(e);
        return reportServerError(response, kbnErr);
      }
    }
  );
};
