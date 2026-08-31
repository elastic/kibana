/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import * as i18n from './translations';

export interface PemCaTlsFields {
  caCert?: string;
  verificationMode?: 'none' | 'certificate' | 'full';
}

/**
 * Optional PEM CA + verification mode fields shared by auth types that talk to
 * self-hosted HTTPS APIs (bearer+TLS, Kubernetes cloud variants, etc.).
 */
export const pemCaTlsSchemaFields = () => ({
  caCert: z
    .string()
    .meta({
      label: i18n.BEARER_WITH_TLS_AUTH_CA_LABEL,
      helpText: i18n.BEARER_WITH_TLS_AUTH_CA_HELP_TEXT,
      widget: 'textarea',
      sensitive: true,
    })
    .optional(),
  verificationMode: z
    .enum(['none', 'certificate', 'full'])
    .meta({
      label: i18n.BEARER_WITH_TLS_AUTH_VERIFICATION_MODE_LABEL,
      helpText: i18n.BEARER_WITH_TLS_AUTH_VERIFICATION_MODE_HELP_TEXT,
    })
    .optional(),
});
