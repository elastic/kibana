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
import { createAwsSigV4Interceptor } from './aws_sigv4_interceptor';

// ============================================================================
// Auth Type Definition
// ============================================================================

const authSchema = lazySchema(() =>
  z
    .object({
      accessKeyId: z
        .string()
        .min(1, { message: i18n.AWS_ACCESS_KEY_ID_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.AWS_ACCESS_KEY_ID_LABEL }),
      secretAccessKey: z
        .string()
        .min(1, { message: i18n.AWS_SECRET_ACCESS_KEY_REQUIRED_MESSAGE })
        .meta({ sensitive: true, label: i18n.AWS_SECRET_ACCESS_KEY_LABEL }),
    })
    .meta({ label: i18n.AWS_CREDENTIALS_LABEL })
);

type AuthSchemaType = z.infer<typeof authSchema>;

export type { AwsSigningRequestConfig } from './aws_sigv4_interceptor';

/**
 * AWS Credentials Authentication (SigV4)
 *
 * Adds a request interceptor that automatically signs every outgoing request
 * to *.amazonaws.com with AWS Signature V4. Non-AWS URLs pass through unsigned.
 *
 * Service and region are extracted from the URL hostname pattern:
 *   {service}.{region}.amazonaws.com
 *
 * Use for: Lambda, S3, EC2, SES, and any other AWS service.
 */
export const AwsCredentialsAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'aws_credentials',
  schema: authSchema,
  configure: async (
    _: AuthContext,
    axiosInstance: AxiosInstance,
    secret: AuthSchemaType
  ): Promise<AxiosInstance> => {
    const { accessKeyId, secretAccessKey } = secret;

    axiosInstance.interceptors.request.use(
      createAwsSigV4Interceptor(() => ({ accessKeyId, secretAccessKey }))
    );

    return axiosInstance;
  },
};
