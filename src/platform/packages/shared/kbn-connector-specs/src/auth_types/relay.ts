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
 * Relay is an Elastic hosted multi-tenant service responsible for holding the relevant third party credentials.
 *
 * `configure` is a deliberate no-op — specs reach the third party through the Relay, so an axios
 * instance that cannot authenticate is the right outcome if a request ever escapes.
 */
export const RelayAuth: AuthTypeSpec<AuthSchemaType> = {
  id: RELAY_AUTH_ID,
  schema: authSchema,
  authMode: 'shared',
  usesRelayTransport: true,
  isKibanaManaged: true,
  configure: async (_: AuthContext, axiosInstance: AxiosInstance): Promise<AxiosInstance> => {
    return axiosInstance;
  },
};
