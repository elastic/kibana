/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import { isString } from 'lodash';
import type { SSLSettings } from '@kbn/actions-utils';
import type { AuthContext } from '../connector_spec';
import { configureAxiosInstanceWithSsl } from '../lib/configure_axios_instance_with_ssl';
import type { PemCaTlsFields } from './pem_ca_tls_schema';

/**
 * Applies an optional pasted PEM CA / verification mode to the axios instance.
 * The CA is provided as PEM text (not a base64-encoded file upload), so it is
 * passed to the SSL layer as a UTF-8 buffer.
 */
export const configurePemCaTls = (
  ctx: AuthContext,
  axiosInstance: AxiosInstance,
  secret: PemCaTlsFields
): AxiosInstance => {
  const sslOverrides: SSLSettings = {
    ...(isString(secret.verificationMode) ? { verificationMode: secret.verificationMode } : {}),
    ...(isString(secret.caCert) ? { ca: Buffer.from(secret.caCert, 'utf8') } : {}),
  };

  return configureAxiosInstanceWithSsl(ctx, axiosInstance, sslOverrides);
};
