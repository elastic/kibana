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
import { i18n } from '@kbn/i18n';
import type { AuthTypeSpec } from '../connector_spec';

const API_KEY_REQUIRED_MESSAGE = i18n.translate('connectorSpecs.apiKeyHeader.requiredApiKey', {
  defaultMessage: 'API key is required',
});

const API_KEY_LABEL = i18n.translate('connectorSpecs.apiKeyHeader.apiKeyLabel', {
  defaultMessage: 'API Key',
});

const HEADER_FIELD_LABEL = i18n.translate('connectorSpecs.apiKeyHeader.headerFieldLabel', {
  defaultMessage: 'API Key Header Field',
});

const HEADER_FIELD_DEFAULT = 'Api-Key';
const authSchema = z.object({
  headerField: z
    .string()
    .min(1, { message: API_KEY_REQUIRED_MESSAGE })
    .default(HEADER_FIELD_DEFAULT)
    .meta({ label: HEADER_FIELD_LABEL, sensitive: true }),
  apiKey: z
    .string()
    .min(1, { message: API_KEY_REQUIRED_MESSAGE })
    .meta({ label: API_KEY_LABEL, sensitive: true }),
});

type AuthSchemaType = z.infer<typeof authSchema>;
type NormalizedAuthSchemaType = Record<string, string>;

/**
 * Header-based authentication (generic)
 * Use for: API keys, custom headers (X-API-Key, etc.)
 */
export const ApiKeyHeaderAuth: AuthTypeSpec<AuthSchemaType> = {
  id: 'api_key_header',
  schema: authSchema,
  normalizeSchema: (defaults?: Record<string, unknown>) => {
    const schemaToUse = z.object({
      ...authSchema.shape,
    });

    if (defaults) {
      // get the default values for the headerField
      const headerField: string =
        defaults.headerField && isString(defaults.headerField)
          ? defaults.headerField
          : HEADER_FIELD_DEFAULT;
      return z.object({
        [headerField]: schemaToUse.shape.apiKey,
      });
    }

    return schemaToUse;
  },
  configure: (axiosInstance: AxiosInstance, secret: NormalizedAuthSchemaType): AxiosInstance => {
    // set global defaults
    Object.keys(secret)
      .filter((key) => key !== 'authType')
      .forEach((key) => {
        axiosInstance.defaults.headers.common[key] = secret[key];
      });

    return axiosInstance;
  },
};
