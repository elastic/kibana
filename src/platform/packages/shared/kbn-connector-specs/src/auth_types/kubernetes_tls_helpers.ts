/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { AxiosInstance } from 'axios';
import { isString } from 'lodash';
import type { SSLSettings } from '@kbn/actions-utils';
import type { AuthContext } from '../connector_spec';
import * as i18n from './translations';
import { configureAxiosInstanceWithSsl } from '../lib/configure_axios_instance_with_ssl';

/**
 * TLS settings shared by every Kubernetes auth variant. Kubernetes API servers
 * almost always present a certificate signed by a private (cluster) CA, so all
 * variants let the user paste the PEM CA and pick a verification mode.
 */
export interface KubernetesTlsFields {
  caCert?: string;
  verificationMode?: 'none' | 'certificate' | 'full';
}

export const kubernetesTlsSchemaFields = () => ({
  caCert: z
    .string()
    .meta({
      label: i18n.KUBERNETES_AUTH_CA_LABEL,
      helpText: i18n.KUBERNETES_AUTH_CA_HELP_TEXT,
      widget: 'textarea',
      sensitive: true,
    })
    .optional(),
  verificationMode: z
    .enum(['none', 'certificate', 'full'])
    .meta({
      label: i18n.KUBERNETES_AUTH_VERIFICATION_MODE_LABEL,
      helpText: i18n.KUBERNETES_AUTH_VERIFICATION_MODE_HELP_TEXT,
    })
    .optional(),
});

/**
 * Applies the cluster CA / verification mode to the axios instance. The CA is
 * provided as PEM text (not a base64-encoded file upload), so it is passed to
 * the SSL layer as a UTF-8 buffer.
 */
export const configureKubernetesTls = (
  ctx: AuthContext,
  axiosInstance: AxiosInstance,
  secret: KubernetesTlsFields
): AxiosInstance => {
  const sslOverrides: SSLSettings = {
    ...(isString(secret.verificationMode) ? { verificationMode: secret.verificationMode } : {}),
    ...(isString(secret.caCert) ? { ca: Buffer.from(secret.caCert, 'utf8') } : {}),
  };

  return configureAxiosInstanceWithSsl(ctx, axiosInstance, sslOverrides);
};
