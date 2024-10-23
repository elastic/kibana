/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { RouterDeprecatedRouteDetails } from '@kbn/core-http-server';
import { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { DeprecationsFactory } from '../deprecations_factory';
import {
  getApiDeprecationMessage,
  getApiDeprecationsManualSteps,
  getApiDeprecationTitle,
} from './i18n_texts';

interface ApiDeprecationsServiceDeps {
  deprecationsFactory: DeprecationsFactory;
  http: InternalHttpServiceSetup;
  coreUsageData: InternalCoreUsageDataSetup;
}

export const buildApiDeprecationId = ({
  routePath,
  routeMethod,
  routeVersion,
}: Pick<RouterDeprecatedRouteDetails, 'routeMethod' | 'routePath' | 'routeVersion'>): string => {
  return [
    routeVersion || 'unversioned',
    routeMethod.toLocaleLowerCase(),
    routePath.replace(/\/$/, ''),
  ].join('|');
};

export const createGetApiDeprecations =
  ({ http, coreUsageData }: Pick<ApiDeprecationsServiceDeps, 'coreUsageData' | 'http'>) =>
  async (): Promise<DeprecationsDetails[]> => {
    const deprecatedRoutes = http.getRegisteredDeprecatedApis();
    const usageClient = coreUsageData.getClient();
    const deprecatedApiUsageStats = await usageClient.getDeprecatedApiUsageStats();

    return deprecatedApiUsageStats
      .filter(({ apiTotalCalls, totalMarkedAsResolved }) => {
        return apiTotalCalls > totalMarkedAsResolved;
      })
      .filter(({ apiId }) =>
        deprecatedRoutes.some((routeDetails) => buildApiDeprecationId(routeDetails) === apiId)
      )
      .map((apiUsageStats) => {
        const { apiId, apiTotalCalls, totalMarkedAsResolved } = apiUsageStats;
        const routeDeprecationDetails = deprecatedRoutes.find(
          (routeDetails) => buildApiDeprecationId(routeDetails) === apiId
        )!;
        const { routeVersion, routePath, routeDeprecationOptions, routeMethod } =
          routeDeprecationDetails;

        const deprecationLevel = routeDeprecationOptions.severity || 'warning';

        return {
          apiId,
          title: getApiDeprecationTitle(routeDeprecationDetails),
          level: deprecationLevel,
          message: getApiDeprecationMessage(routeDeprecationDetails, apiUsageStats),
          documentationUrl: routeDeprecationOptions.documentationUrl,
          correctiveActions: {
            manualSteps: getApiDeprecationsManualSteps(routeDeprecationDetails),
            mark_as_resolved_api: {
              routePath,
              routeMethod,
              routeVersion,
              apiTotalCalls,
              totalMarkedAsResolved,
              timestamp: new Date(),
            },
          },
          deprecationType: 'api',
          domainId: 'core.routes-deprecations',
        };
      });
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
