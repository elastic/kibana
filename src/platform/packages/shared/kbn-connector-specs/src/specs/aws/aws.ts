/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAxiosError } from 'axios';
import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';
import type { RequestInput } from './types';
import { RequestInputSchema } from './types';

const toAwsError = (service: string, error: unknown): unknown => {
  if (!isAxiosError(error) || !error.response) {
    return error;
  }
  const { status, data } = error.response;
  const details = typeof data === 'string' ? data : JSON.stringify(data);
  return new Error(`AWS ${service} request failed with status ${status}: ${details}`);
};

export const AwsConnector: ConnectorSpec = {
  metadata: {
    id: '.aws',
    displayName: 'AWS',
    description: i18n.translate('connectorSpecs.aws.metadata.description', {
      defaultMessage: 'Send SigV4-signed requests to any AWS service API',
    }),
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
    docsUrl: '',
  },

  auth: {
    types: ['aws_credentials'],
  },

  actions: {
    request: {
      isTool: false,
      scope: 'destroy',
      description:
        'Send a SigV4-signed request to any AWS service API and return its status, headers, and body. ' +
        'JSON bodies are parsed; XML bodies (Query-protocol APIs such as IAM, STS, and EC2) are returned as text.',
      input: RequestInputSchema,
      handler: async (ctx, input: RequestInput) => {
        const { service, region, method, path, query, headers, body } = input;
        const host = region ? `${service}.${region}.amazonaws.com` : `${service}.amazonaws.com`;

        try {
          const response = await ctx.client.request({
            method,
            url: `https://${host}${path}`,
            params: query,
            headers,
            data: body === undefined || typeof body === 'string' ? body : JSON.stringify(body),
          });
          return { status: response.status, headers: response.headers, data: response.data };
        } catch (error) {
          throw toAwsError(service, error);
        }
      },
    },
  },

  test: {
    handler: async (ctx) => {
      await ctx.client.get('https://sts.amazonaws.com/', {
        params: { Action: 'GetCallerIdentity', Version: '2011-06-15' },
      });
      return {};
    },
    description: i18n.translate('connectorSpecs.aws.test.description', {
      defaultMessage: 'Verifies the AWS credentials with STS GetCallerIdentity',
    }),
    enabled: true,
  },
};
