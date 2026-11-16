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
import { getConnectorsUrl, isNoAiConnectorError } from './ai_connector';

describe('isNoAiConnectorError', () => {
  it('recognizes the code the AI routes answer with when no connector is set up', () => {
    expect(
      isNoAiConnectorError({ body: { attributes: { code: NO_AI_CONNECTOR_ERROR_CODE } } })
    ).toBe(true);
  });

  it('is false for any other failure', () => {
    expect(isNoAiConnectorError({ body: { message: 'boom' } })).toBe(false);
    expect(isNoAiConnectorError({ body: { attributes: { code: 'other' } } })).toBe(false);
    expect(isNoAiConnectorError(new Error('boom'))).toBe(false);
    expect(isNoAiConnectorError(undefined)).toBe(false);
  });
});

describe('getConnectorsUrl', () => {
  const application = (canManageConnectors: boolean) =>
    ({
      capabilities: {
        management: { insightsAndAlerting: { triggersActionsConnectors: canManageConnectors } },
      },
      getUrlForApp: jest.fn(
        (app: string, { deepLinkId, path }: { deepLinkId?: string; path?: string }) =>
          `/app/${app}/${deepLinkId}${path}`
      ),
    } as unknown as Pick<ApplicationStart, 'capabilities' | 'getUrlForApp'>);

  it('links to the connectors page for a user who may open it', () => {
    expect(getConnectorsUrl(application(true))).toBe(
      '/app/management/triggersActionsConnectors/connectors'
    );
  });

  it('has no link for a user who may not', () => {
    expect(getConnectorsUrl(application(false))).toBeUndefined();
  });
});
