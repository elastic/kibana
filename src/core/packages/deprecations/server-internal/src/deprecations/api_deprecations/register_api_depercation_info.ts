/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DeprecationsDetails } from '@kbn/core-deprecations-common';

import { buildApiRouteDeprecationDetails } from './route/route_deprecations';
import { buildApiAccessDeprecationDetails } from './access/access_deprecations';
import { buildApiDeprecationId } from './api_deprecation_id';
import type { ApiDeprecationsServiceDeps } from './types';

export const createGetApiDeprecations =
  ({
    http,
    coreUsageData,
    docLinks,
  }: Pick<ApiDeprecationsServiceDeps, 'coreUsageData' | 'http' | 'docLinks'>) =>
  async (): Promise<DeprecationsDetails[]> => {
    const usageClient = coreUsageData.getClient();
    const deprecatedApis = http.getRegisteredDeprecatedApis();
    const deprecatedApiUsageStats = await usageClient.getDeprecatedApiUsageStats();

    return deprecatedApiUsageStats
      .filter(({ apiTotalCalls, totalMarkedAsResolved }) => {
        return apiTotalCalls > totalMarkedAsResolved;
      })
      .filter(({ apiId }) =>
        deprecatedApis.some((routeDetails) => buildApiDeprecationId(routeDetails) === apiId)
      )
      .map((apiUsageStats) => {
        const { apiId } = apiUsageStats;
        const deprecatedApiDetails = deprecatedApis.find(
          (routeDetails) => buildApiDeprecationId(routeDetails) === apiId
        );
        if (!deprecatedApiDetails) {
          throw new Error(`Unable to find deprecation details for "${apiId}"`);
        }

        const { routeAccess } = deprecatedApiDetails;
        switch (routeAccess) {
          case 'public': {
            return buildApiRouteDeprecationDetails({
              apiUsageStats,
              deprecatedApiDetails,
              docLinks,
            });
          }
          // if no access is specified then internal is the default
          case 'internal':
          default: {
            return buildApiAccessDeprecationDetails({
              apiUsageStats,
              deprecatedApiDetails,
              docLinks,
            });
          }
        }
      });
  };

export const registerApiDeprecationsInfo = ({
  deprecationsFactory,
  http,
  coreUsageData,
  docLinks,
}: ApiDeprecationsServiceDeps): void => {
  const deprecationsRegistery = deprecationsFactory.getRegistry('core.api_deprecations');

  deprecationsRegistery.registerDeprecations({
    getDeprecations: createGetApiDeprecations({ http, coreUsageData, docLinks }),
  });
};
