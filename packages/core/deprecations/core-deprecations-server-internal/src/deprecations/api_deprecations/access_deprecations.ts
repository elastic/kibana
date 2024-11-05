/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ApiDeprecationDetails,
  DomainDeprecationDetails,
} from '@kbn/core-deprecations-common';
import type { BuildApiDeprecationDetailsParams } from './types';
import {
  getApiDeprecationMessage,
  getApiDeprecationsManualSteps,
  getApiDeprecationTitle,
} from './i18n_texts';
import { buildApiDeprecationId } from './api_deprecation_id';

export const buildApiAccessDeprecationDetails = ({
  apiUsageStats,
  deprecatedApis,
}: BuildApiDeprecationDetailsParams): DomainDeprecationDetails<ApiDeprecationDetails> => {
  const { apiId, apiTotalCalls, totalMarkedAsResolved } = apiUsageStats;
  const routeDeprecationDetails = deprecatedApis.find(
    (routeDetails) => buildApiDeprecationId(routeDetails) === apiId
  )!;
  const { routeVersion, routePath, routeDeprecationOptions, routeMethod } = routeDeprecationDetails;

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
    domainId: 'core.http.access-deprecations',
  };
};
