/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaResponseFactory } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { InternalUiSettingsRouter } from '../../internal_types';

const AUTHZ_DISABLED_REASON =
  'This route returns the registered setting definitions, which are the same for every user';

export function registerInternalGetMetadataRoute(router: InternalUiSettingsRouter) {
  const respondWithDefinitions = (
    uiSettingsClient: IUiSettingsClient,
    response: KibanaResponseFactory
  ) => response.ok({ body: { settings: uiSettingsClient.getRegistered() } });

  router.get(
    {
      path: '/internal/kibana/settings/metadata',
      validate: false,
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: AUTHZ_DISABLED_REASON } },
    },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.client;
      return respondWithDefinitions(uiSettingsClient, response);
    }
  );

  router.get(
    {
      path: '/internal/kibana/global_settings/metadata',
      validate: false,
      options: { access: 'internal' },
      security: { authz: { enabled: false, reason: AUTHZ_DISABLED_REASON } },
    },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.globalClient;
      return respondWithDefinitions(uiSettingsClient, response);
    }
  );
}
