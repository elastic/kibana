/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import { CoreSetup } from '@kbn/core/server';

export const setupOptionsListClusterSettingsRoute = ({ http }: CoreSetup) => {
  const router = http.createRouter();
  router.get(
    {
      path: '/api/kibana/controls/optionsList/getClusterSettings',
      validate: false,
    },
    async (context, _, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const settings = await esClient.cluster.getSettings({
          include_defaults: true,
          filter_path: '**.allow_expensive_queries',
        });

        // priority: transient -> persistent -> default
        const allowExpensiveQueries: string =
          settings.transient?.search?.allow_expensive_queries ??
          settings.persistent?.search?.allow_expensive_queries ??
          settings.defaults?.search?.allow_expensive_queries ??
          // by default, the allowExpensiveQueries cluster setting is undefined; so, we need to treat this the same
          // as `true` since that's the way other applications (such as the dashboard listing page) handle this.
          'true';

        return response.ok({
          body: {
            allowExpensiveQueries: allowExpensiveQueries === 'true',
          },
        });
      } catch (e) {
        const kbnErr = getKbnServerError(e);
        return reportServerError(response, kbnErr);
      }
    }
  );
};
