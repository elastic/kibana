/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApplicationStart } from '@kbn/core/public';
import { NO_AI_CONNECTOR_ERROR_CODE } from '@kbn/esql-types';

/** Whether a failed request was refused because no AI connector is set up. */
export const isNoAiConnectorError = (caught: unknown): boolean => {
  const code = (caught as { body?: { attributes?: { code?: unknown } } } | undefined)?.body
    ?.attributes?.code;
  return code === NO_AI_CONNECTOR_ERROR_CODE;
};

/** The link to the page where connectors are set up, when the user is allowed to open it. */
export const getConnectorsUrl = (
  application: Pick<ApplicationStart, 'capabilities' | 'getUrlForApp'>
): string | undefined =>
  application.capabilities.management?.insightsAndAlerting?.triggersActionsConnectors
    ? application.getUrlForApp('management', {
        deepLinkId: 'triggersActionsConnectors',
        path: '/connectors',
      })
    : undefined;
