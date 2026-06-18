/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import type { AuthContext, AuthTypeSpec } from '../connector_spec';

export const MONGODB_CONNECTION_STRING_AUTH_ID = 'mongodb_connection_string';

const authSchema = lazySchema(() =>
  z
    .object({
      connectionString: z
        .string()
        .min(1)
        .meta({
          sensitive: true,
          label: i18n.translate('connectorSpecs.mongodbConnectionString.auth.label', {
            defaultMessage: 'Connection string',
          }),
          helpText: i18n.translate('connectorSpecs.mongodbConnectionString.auth.helpText', {
            defaultMessage:
              'The full MongoDB connection string, including credentials. ' +
              'Use mongodb+srv:// for Atlas clusters or mongodb:// for self-hosted deployments.',
          }),
          placeholder: 'mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true',
        }),
    })
    .meta({
      label: i18n.translate('connectorSpecs.mongodbConnectionString.auth.groupLabel', {
        defaultMessage: 'MongoDB connection string',
      }),
    })
);

type AuthSchemaType = z.infer<typeof authSchema>;

/**
 * MongoDB Connection String Authentication
 *
 * Stores the MongoDB connection string as an encrypted secret.
 * The connection string encodes all auth credentials (username, password,
 * authSource, TLS options). The Axios instance is not configured because
 * MongoDB connectors use the native mongodb driver, not HTTP/Axios.
 */
export const MongoDBConnectionStringAuth: AuthTypeSpec<AuthSchemaType> = {
  id: MONGODB_CONNECTION_STRING_AUTH_ID,
  schema: authSchema,
  configure: async (_: AuthContext, axiosInstance: AxiosInstance): Promise<AxiosInstance> => {
    // No-op: MongoDB connectors use the native driver (not Axios).
    // The connection string is read from ctx.secrets.connectionString at
    // handler execution time.
    return axiosInstance;
  },
};
