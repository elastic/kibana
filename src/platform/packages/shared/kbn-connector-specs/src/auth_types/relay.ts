/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';
import * as i18n from './translations';

export const RELAY_AUTH_ID = 'relay';

const authSchema = lazySchema(() =>
  z
    .object({
      tenantKey: z.string().min(1).meta({ hidden: true }),
    })
    .meta({ label: i18n.RELAY_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * Relay authentication.
 *
 * The Relay is an Elastic-hosted service that owns the third-party credentials on behalf of a
 * deployment: the deployment installs an Elastic-owned app (today, the Elastic Slack app) once,
 * connects the resources it wants to reach, and the Relay authenticates the deployment itself at
 * the transport layer with mTLS. A connector using this auth type therefore holds no credentials —
 * `tenantKey` only identifies which connected workspace it speaks for, and is set programmatically
 * when the app connection is established, never entered by a user.
 *
 * Unlike every other auth type, this one configures nothing on the axios instance. Specs that
 * support it reach the Relay through `ActionContext.relay` instead of calling the third-party API,
 * so a relay-authenticated connector must never send a request to the third party — an instance
 * without credentials is the correct outcome if one ever slips through.
 */
export const RelayAuth: AuthTypeSpec<AuthSchemaType> = {
  id: RELAY_AUTH_ID,
  schema: authSchema,
  authMode: 'shared',
  configure: async (_: AuthContext, axiosInstance: AxiosInstance): Promise<AxiosInstance> => {
    return axiosInstance;
  },
};
