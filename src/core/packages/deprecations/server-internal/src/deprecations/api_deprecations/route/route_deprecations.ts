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
import _ from 'lodash';
import type { PostValidationMetadata } from '@kbn/core-http-server';
import {
  getApiDeprecationMessage,
  getApiDeprecationsManualSteps,
  getApiDeprecationTitle,
} from './i18n_texts';
import type { BuildApiDeprecationDetailsParams } from '../types';

export const getIsRouteApiDeprecation = ({
  isInternalApiRequest,
  deprecated,
}: PostValidationMetadata): boolean => {
  const hasDeprecatedObject = deprecated && _.isObject(deprecated);
  const isNotInternalRequest = !isInternalApiRequest;

  return !!(hasDeprecatedObject && isNotInternalRequest);
};

export const buildApiRouteDeprecationDetails = ({
  apiUsageStats,
  deprecatedApiDetails,
  docLinks,
}: BuildApiDeprecationDetailsParams): DomainDeprecationDetails<ApiDeprecationDetails> => {
  const { apiId, apiTotalCalls, totalMarkedAsResolved } = apiUsageStats;
  const { routeVersion, routePath, routeDeprecationOptions, routeMethod } = deprecatedApiDetails;
  if (!routeDeprecationOptions) {
    throw new Error(`Expecing deprecated to be defined for route ${apiId}`);
  }

  const deprecationLevel = routeDeprecationOptions.severity || 'warning';

  return {
    apiId,
    title: getApiDeprecationTitle(deprecatedApiDetails),
    level: deprecationLevel,
    message: getApiDeprecationMessage(deprecatedApiDetails, apiUsageStats, docLinks),
    documentationUrl: routeDeprecationOptions.documentationUrl,
    correctiveActions: {
      manualSteps: getApiDeprecationsManualSteps(deprecatedApiDetails),
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
    domainId: 'core.http.routes-deprecations',
  };
};
