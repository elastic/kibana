/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';
import { CoreSetup } from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';

export const setupOptionsListClusterSettingsRoute = ({ http }: CoreSetup) => {
  const router = http.createRouter();
  router.get(
    {
      path: '/api/kibana/controls/optionsList/getExpensiveQueriesSetting',
      validate: false,
    },
    async (context, _, response) => {
      try {
        /**
         *  using internal user here because in many cases the logged in user will not have the monitor permission required
         * to check cluster settings. This endpoint does not take a query, params, or a body, so there is no chance of leaking info.
         */
        const esClient = (await context.core).elasticsearch.client.asInternalUser;
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
        if (e instanceof errors.ResponseError && e.body.error.type === 'security_exception') {
          /**
           * in cases where the user does not have the 'monitor' permission this check will fail. In these cases, we will
           * fall back to assume that the allowExpensiveQueries setting is on, because it defaults to true.
           */
          return response.ok({
            body: {
              allowExpensiveQueries: true,
            },
          });
        }
        const kbnErr = getKbnServerError(e);
        return reportServerError(response, kbnErr);
      }
    }
  );
};
