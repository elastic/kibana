/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DeprecationsDetails } from '@kbn/core-deprecations-common';

import _ from 'lodash';
import { buildApiRouteDeprecationDetails } from './route_deprecations';
import { buildApiAccessDeprecationDetails } from './access_deprecations';

import { ApiDeprecationsServiceDeps } from './types';
import { buildApiDeprecationId } from './api_deprecation_id';

export const createGetApiDeprecations =
  ({ http, coreUsageData }: Pick<ApiDeprecationsServiceDeps, 'coreUsageData' | 'http'>) =>
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
        const { internal: internalApiDeprecationedRoutes, ...deprecatedRoutes } = _.groupBy(
          deprecatedApis,
          'routeAccess'
        );

        return [
          buildApiRouteDeprecationDetails({
            apiUsageStats,
            deprecatedApis: Object.values(deprecatedRoutes).flat(),
          }),
          buildApiAccessDeprecationDetails({
            apiUsageStats,
            deprecatedApis: Object.values(internalApiDeprecationedRoutes),
          }),
        ];
      })
      .flat();
  };

export const registerApiDeprecationsInfo = ({
  deprecationsFactory,
  http,
  coreUsageData,
}: ApiDeprecationsServiceDeps): void => {
  const deprecationsRegistery = deprecationsFactory.getRegistry('core.api_deprecations');

  deprecationsRegistery.registerDeprecations({
    getDeprecations: createGetApiDeprecations({ http, coreUsageData }),
  });
};
