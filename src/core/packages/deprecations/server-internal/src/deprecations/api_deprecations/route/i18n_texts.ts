/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RouterDeprecatedApiDetails } from '@kbn/core-http-server';
import { CoreDeprecatedApiUsageStats } from '@kbn/core-usage-data-server';
import type { DeprecationDetailsMessage } from '@kbn/core-deprecations-common';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { DocLinksServiceSetup } from '@kbn/core-doc-links-server';

export const getApiDeprecationTitle = (details: RouterDeprecatedApiDetails) => {
  const { routePath, routeMethod, routeDeprecationOptions } = details;
  if (!routeDeprecationOptions) {
    throw new Error(`Router "deprecated" param is missing for path "${routePath}".`);
  }

  const deprecationType = routeDeprecationOptions.reason.type;
  const routeWithMethod = `${routeMethod.toUpperCase()} ${routePath}`;
  const deprecationTypeText = i18n.translate('core.deprecations.apiRouteDeprecation.type', {
    defaultMessage:
      '{deprecationType, select, remove {is removed} bump {has a newer version available} migrate {is migrated to a different API} other {is deprecated}}',
    values: { deprecationType },
  });

  return i18n.translate('core.deprecations.apiRouteDeprecation.infoTitle', {
    defaultMessage: 'The "{routeWithMethod}" route {deprecationTypeText}',
    values: {
      routeWithMethod,
      deprecationTypeText,
    },
  });
};

export const getApiDeprecationMessage = (
  details: RouterDeprecatedApiDetails,
  apiUsageStats: CoreDeprecatedApiUsageStats,
  docLinks: DocLinksServiceSetup
): Array<string | DeprecationDetailsMessage> => {
  const { routePath, routeMethod, routeDeprecationOptions } = details;
  if (!routeDeprecationOptions) {
    throw new Error(`Router "deprecated" param is missing for path "${routePath}".`);
  }
  const { apiLastCalledAt, apiTotalCalls, markedAsResolvedLastCalledAt, totalMarkedAsResolved } =
    apiUsageStats;

  const diff = apiTotalCalls - totalMarkedAsResolved;
  const wasResolvedBefore = totalMarkedAsResolved > 0;
  const routeWithMethod = `${routeMethod.toUpperCase()} ${routePath}`;

  const messages: Array<string | DeprecationDetailsMessage> = [
    i18n.translate('core.deprecations.apiRouteDeprecation.apiCallsDetailsMessage', {
      defaultMessage:
        'The API "{routeWithMethod}" has been called {apiTotalCalls} times. The last call was on {apiLastCalledAt}.',
      values: {
        routeWithMethod,
        apiTotalCalls,
        apiLastCalledAt: moment(apiLastCalledAt).format('LLLL Z'),
      },
    }),
    {
      type: 'markdown',
      content: i18n.translate('core.deprecations.apiRouteDeprecation.enableDebugLogsMessage', {
        defaultMessage:
          'To include information about deprecated API calls in debug logs, edit your Kibana configuration as detailed in [the documentation]({enableDeprecationHttpDebugLogsLink}).',
        values: {
          enableDeprecationHttpDebugLogsLink: docLinks.links.logging.enableDeprecationHttpDebugLogs,
        },
      }),
    },
  ];

  if (wasResolvedBefore) {
    messages.push(
      i18n.translate('core.deprecations.apiRouteDeprecation.previouslyMarkedAsResolvedMessage', {
        defaultMessage:
          'This issue has been marked as resolved on {markedAsResolvedLastCalledAt} but the API has been called {timeSinceLastResolved, plural, one {# time} other {# times}} since.',
        values: {
          timeSinceLastResolved: diff,
          markedAsResolvedLastCalledAt: moment(markedAsResolvedLastCalledAt).format('LLLL Z'),
        },
      })
    );
  }

  if (routeDeprecationOptions.message) {
    // Surfaces additional deprecation messages passed into the route in UA
    messages.push(routeDeprecationOptions.message);
  }

  return messages;
};

export const getApiDeprecationsManualSteps = (details: RouterDeprecatedApiDetails): string[] => {
  const { routePath, routeDeprecationOptions } = details;
  if (!routeDeprecationOptions) {
    throw new Error(`Router "deprecated" param is missing for path "${routePath}".`);
  }

  const deprecationType = routeDeprecationOptions.reason.type;

  const manualSteps = [
    i18n.translate('core.deprecations.apiRouteDeprecation.manualSteps.identifyCallsOriginStep', {
      defaultMessage: 'Identify the origin of these API calls.',
    }),
  ];

  switch (deprecationType) {
    case 'bump': {
      const { newApiVersion } = routeDeprecationOptions.reason;
      manualSteps.push(
        i18n.translate('core.deprecations.apiRouteDeprecation.manualSteps.bumpTypeStep', {
          defaultMessage:
            'Update the requests to use the following new version of the API instead: "{newApiVersion}".',
          values: { newApiVersion },
        })
      );
      break;
    }

    case 'remove': {
      manualSteps.push(
        i18n.translate('core.deprecations.apiRouteDeprecation.manualSteps.removeTypeStep', {
          defaultMessage:
            'This API no longer exists and no replacement is available. Delete any requests you have that use this API.',
        })
      );
      break;
    }
    case 'deprecate': {
      manualSteps.push(
        i18n.translate('core.deprecations.apiRouteDeprecation.manualSteps.deprecateTypeStep', {
          defaultMessage:
            'For now, the API will still work, but will be moved or removed in a future version. Check the Learn more link for more information. If you are no longer using the API, you can mark this issue as resolved. It will no longer appear in the Upgrade Assistant unless another call using this API is detected.',
        })
      );
      break;
    }
    case 'migrate': {
      const { newApiPath, newApiMethod } = routeDeprecationOptions.reason;
      const newRouteWithMethod = `${newApiMethod.toUpperCase()} ${newApiPath}`;

      manualSteps.push(
        i18n.translate('core.deprecations.apiRouteDeprecation.manualSteps.migrateTypeStep', {
          defaultMessage:
            'Update the requests to use the following new API instead: "{newRouteWithMethod}".',
          values: { newRouteWithMethod },
        })
      );
      break;
    }
  }

  if (deprecationType !== 'deprecate') {
    manualSteps.push(
      i18n.translate(
        'core.deprecations.apiRouteDeprecation.manualSteps.routeDepractionMarkAsResolvedStep',
        {
          defaultMessage:
            'Check that you are no longer using the old API in any requests, and mark this issue as resolved. It will no longer appear in the Upgrade Assistant unless another call using this API is detected.',
        }
      )
    );
  }

  return manualSteps;
};
