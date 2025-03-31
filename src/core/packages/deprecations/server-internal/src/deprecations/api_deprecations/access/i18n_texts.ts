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
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import type { DeprecationDetailsMessage } from '@kbn/core-deprecations-common';

export const getApiDeprecationTitle = (
  details: Pick<RouterDeprecatedApiDetails, 'routePath' | 'routeMethod'>
) => {
  const { routePath, routeMethod } = details;
  const routeWithMethod = `${routeMethod.toUpperCase()} ${routePath}`;

  return i18n.translate('core.deprecations.apiAccessDeprecation.infoTitle', {
    defaultMessage: 'The "{routeWithMethod}" API is internal to Elastic',
    values: {
      routeWithMethod,
    },
  });
};

export const getApiDeprecationMessage = (
  details: Pick<
    RouterDeprecatedApiDetails,
    'routePath' | 'routeMethod' | 'routeDeprecationOptions'
  >,
  apiUsageStats: CoreDeprecatedApiUsageStats,
  docLinks: DocLinksServiceSetup
): Array<string | DeprecationDetailsMessage> => {
  const { routePath, routeMethod, routeDeprecationOptions } = details;
  const { apiLastCalledAt, apiTotalCalls, markedAsResolvedLastCalledAt, totalMarkedAsResolved } =
    apiUsageStats;

  const diff = apiTotalCalls - totalMarkedAsResolved;
  const wasResolvedBefore = totalMarkedAsResolved > 0;
  const routeWithMethod = `${routeMethod.toUpperCase()} ${routePath}`;

  const messages: Array<string | DeprecationDetailsMessage> = [
    i18n.translate('core.deprecations.apiAccessDeprecation.apiCallsDetailsMessage', {
      defaultMessage:
        'The API "{routeWithMethod}" has been called {apiTotalCalls} times. The last call was on {apiLastCalledAt}.',
      values: {
        routeWithMethod,
        apiTotalCalls,
        apiLastCalledAt: moment(apiLastCalledAt).format('LLLL Z'),
      },
    }),
  ];

  if (wasResolvedBefore) {
    messages.push(
      i18n.translate('core.deprecations.apiAccessDeprecation.previouslyMarkedAsResolvedMessage', {
        defaultMessage:
          'This issue has been marked as resolved on {markedAsResolvedLastCalledAt} but the API has been called {timeSinceLastResolved, plural, one {# time} other {# times}} since.',
        values: {
          timeSinceLastResolved: diff,
          markedAsResolvedLastCalledAt: moment(markedAsResolvedLastCalledAt).format('LLLL Z'),
        },
      })
    );
  }

  messages.push(
    i18n.translate('core.deprecations.apiAccessDeprecation.internalApiExplanationMessage', {
      defaultMessage:
        'Internal APIs are meant to be used by Elastic services only. You should not use them. External access to these APIs will be restricted.',
    })
  );
  messages.push({
    type: 'markdown',
    content: i18n.translate('core.deprecations.apiAccessDeprecation.enableDebugLogsMessage', {
      defaultMessage:
        'To include information in debug logs about calls to APIs that are internal to Elastic, edit your Kibana configuration as detailed in [the documentation]({enableDeprecationHttpDebugLogsLink}).',
      values: {
        enableDeprecationHttpDebugLogsLink: docLinks.links.logging.enableDeprecationHttpDebugLogs,
      },
    }),
  });

  if (routeDeprecationOptions?.message) {
    // Surfaces additional deprecation messages passed into the route in UA
    messages.push(routeDeprecationOptions.message);
  }

  return messages;
};

export const getApiDeprecationsManualSteps = (): string[] => {
  return [
    i18n.translate('core.deprecations.apiAccessDeprecation.manualSteps.identifyCallsOriginStep', {
      defaultMessage: 'Identify the origin of these API calls.',
    }),
    i18n.translate('core.deprecations.apiAccessDeprecation.manualSteps.deleteRequestsStep', {
      defaultMessage:
        'Delete any requests you have that use this API. Check the learn more link for possible alternatives.',
    }),
    i18n.translate(
      'core.deprecations.apiAccessDeprecation.manualSteps.accessDepractionMarkAsResolvedStep',
      {
        defaultMessage:
          'Once you have successfully stopped using this API, mark this issue as resolved. It will no longer appear in the Upgrade Assistant unless another call using this API is detected.',
      }
    ),
  ];
};
