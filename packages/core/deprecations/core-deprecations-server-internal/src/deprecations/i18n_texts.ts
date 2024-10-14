/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RouterDeprecatedRouteDetails } from '@kbn/core-http-server';
import { CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';
import { i18n } from '@kbn/i18n';
import moment from 'moment';

export const getApiDeprecationTitle = (details: RouterDeprecatedRouteDetails) => {
  const { routePath, routeMethod } = details;
  const routeWithMethod = `${routeMethod.toUpperCase()} ${routePath}`;
  const deprecationTypeText = getApiDeprecationTypeText(details);

  return i18n.translate('core.deprecations.deprecations.apiDeprecationInfoTitle', {
    defaultMessage: 'The "{routeWithMethod}" route {deprecationTypeText}',
    values: {
      routeWithMethod,
      deprecationTypeText,
    },
  });
};

export const getApiDeprecationTypeText = (details: RouterDeprecatedRouteDetails) => {
  const { routeDeprecationOptions } = details;
  const deprecationType = routeDeprecationOptions.reason.type;

  return i18n.translate('core.deprecations.deprecations.apiDeprecationType', {
    defaultMessage:
      '{deprecationType, select, remove {will be removed} bump {has a new version bump} migrate {has been migrated to a different API} other {has been marked as deprecated}}',
    values: { deprecationType },
  });
};

export const getApiDeprecationMessage = (
  details: RouterDeprecatedRouteDetails,
  apiUsageStats: CoreDeprecatedApiUsageStats
) => {
  const { routePath, routeMethod } = details;
  const { apiLastCalledAt, apiTotalCalls, markedAsResolvedLastCalledAt, totalMarkedAsResolved } =
    apiUsageStats;

  const diff = apiTotalCalls - totalMarkedAsResolved;
  const wasResolvedBefore = totalMarkedAsResolved > 0;
  const routeWithMethod = `${routeMethod.toUpperCase()} ${routePath}`;

  const messages = [
    i18n.translate('core.deprecations.deprecations.apiDeprecationApiCallsDetailsMessage', {
      defaultMessage:
        'The API {routeWithMethod} has been called {apiTotalCalls} times. The API was last called on {apiLastCalledAt}.',
      values: {
        routeWithMethod,
        apiTotalCalls,
        apiLastCalledAt: moment(apiLastCalledAt).format('LLLL Z'),
      },
    }),
  ];

  if (wasResolvedBefore) {
    messages.push(
      i18n.translate(
        'core.deprecations.deprecations.apiDeprecationPreviouslyMarkedAsResolvedMessage',
        {
          defaultMessage:
            'This API has been marked as resolved before. It has been called {timeSinceLastResolved} times since it was marked as resolved on {markedAsResolvedLastCalledAt}.',
          values: {
            timeSinceLastResolved: diff,
            markedAsResolvedLastCalledAt: moment(markedAsResolvedLastCalledAt).format('LLLL Z'),
          },
        }
      )
    );
  }

  return messages.join('\n');
};

export const getApiDeprecationsManualSteps = (details: RouterDeprecatedRouteDetails): string[] => {
  const { routeDeprecationOptions, routePath } = details;
  const { documentationUrl } = routeDeprecationOptions;
  const deprecationType = routeDeprecationOptions.reason.type;

  const manualSteps = [
    i18n.translate('core.deprecations.deprecations.manualSteps.apiIseprecatedStep', {
      defaultMessage: 'This API {deprecationTypeText}',
      values: { deprecationTypeText: getApiDeprecationTypeText(details) },
    }),
  ];

  switch (deprecationType) {
    case 'bump': {
      const { newApiVersion } = routeDeprecationOptions.reason;
      manualSteps.push(
        i18n.translate('core.deprecations.deprecations.manualSteps.bumpTypeExplainationStep', {
          defaultMessage:
            'A version bump deprecation means the API has a new version and the current version will be removed in the future in favor of the newer version.',
        }),
        i18n.translate('core.deprecations.deprecations.manualSteps.bumpDetailsStep', {
          defaultMessage: 'This API {routePath} has a new version "{newApiVersion}".',
          values: { routePath, newApiVersion },
        })
      );
      break;
    }
    case 'remove': {
      manualSteps.push(
        i18n.translate('core.deprecations.deprecations.manualSteps.removeTypeExplainationStep', {
          defaultMessage:
            'This API will be completely removed. You will no longer be able to use it in the future.',
        })
      );
      break;
    }
    case 'migrate': {
      const { newApiPath, newApiMethod } = routeDeprecationOptions.reason;
      manualSteps.push(
        i18n.translate('core.deprecations.deprecations.manualSteps.migrateTypeExplainationStep', {
          defaultMessage:
            'This API will be migrated to a different API and will be removed in the future in favor of the other API.',
        }),
        i18n.translate('core.deprecations.deprecations.manualSteps.migrateDetailsStep', {
          defaultMessage: 'This API {routePath} has been migrated to {newApiMethod} {newApiPath}',
          values: { newApiMethod: newApiMethod.toUpperCase(), newApiPath, routePath },
        })
      );
      break;
    }
  }

  if (documentationUrl) {
    manualSteps.push(
      i18n.translate('core.deprecations.deprecations.manualSteps.documentationStep', {
        defaultMessage:
          'Click the learn more documentation link for more details on addressing the deprecated API.',
      })
    );
  }

  manualSteps.push(
    i18n.translate('core.deprecations.deprecations.manualSteps.markAsResolvedStep', {
      defaultMessage:
        'Once you are no longer using the deprecated API. You can click on the "Mark as Resolved" button to track if the API is still getting called.',
    }),
    i18n.translate('core.deprecations.deprecations.manualSteps.deprecationWillBeHiddenStep', {
      defaultMessage:
        'The deprecation will be hidden from the Upgrade Assistant unless the deprecated API has been called again.',
    })
  );

  return manualSteps;
};
