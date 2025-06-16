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

import type { PostValidationMetadata } from '@kbn/core-http-server';
import type { BuildApiDeprecationDetailsParams } from '../types';
import {
  getApiDeprecationMessage,
  getApiDeprecationsManualSteps,
  getApiDeprecationTitle,
} from './i18n_texts';

export const getIsAccessApiDeprecation = ({
  isInternalApiRequest,
  isPublicAccess,
}: PostValidationMetadata): boolean => {
  const isNotPublicAccess = !isPublicAccess;
  const isNotInternalRequest = !isInternalApiRequest;

  return !!(isNotPublicAccess && isNotInternalRequest);
};

export const buildApiAccessDeprecationDetails = ({
  apiUsageStats,
  deprecatedApiDetails,
  docLinks,
}: BuildApiDeprecationDetailsParams): DomainDeprecationDetails<ApiDeprecationDetails> => {
  const { apiId, apiTotalCalls, totalMarkedAsResolved } = apiUsageStats;
  const { routeVersion, routePath, routeDeprecationOptions, routeMethod } = deprecatedApiDetails;

  const deprecationLevel = routeDeprecationOptions?.severity || 'warning';

  return {
    apiId,
    title: getApiDeprecationTitle(deprecatedApiDetails),
    level: deprecationLevel,
    message: getApiDeprecationMessage(deprecatedApiDetails, apiUsageStats, docLinks),
    documentationUrl: routeDeprecationOptions?.documentationUrl,
    correctiveActions: {
      manualSteps: getApiDeprecationsManualSteps(),
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
