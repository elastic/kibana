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
import type { ConnectorSpec } from '../../connector_spec';
import { parseServiceAccountKey } from '../../auth_types/gcp_jwt_helpers';

const parseCsv = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim());
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(/[,\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);
};

export const GcpCliConnector: ConnectorSpec = {
  metadata: {
    id: '.gcp_cli',
    displayName: 'Google Cloud CLI',
    description: i18n.translate('connectorSpecs.gcpCli.metadata.description', {
      defaultMessage:
        'Prepare Google Cloud CLI credentials for sandboxed coding agents using a GCP service account',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
    docsUrl: '',
  },

  auth: {
    types: ['gcp_service_account'],
    headers: {
      Accept: 'application/json',
    },
  },

  schema: lazySchema(() =>
    z.object({
      projectId: z
        .string()
        .min(1)
        .describe('GCP project ID this connector may prepare CLI access for')
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.gcpCli.config.projectId.label', {
            defaultMessage: 'GCP project ID',
          }),
          placeholder: 'my-gcp-project',
        }),
      allowedServices: z
        .string()
        .optional()
        .describe('Google Cloud services this connector may expose to sandboxed CLI runs')
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.gcpCli.config.allowedServices.label', {
            defaultMessage: 'Allowed services',
          }),
          placeholder: 'logging, storage, cloud_run',
          helpText: i18n.translate('connectorSpecs.gcpCli.config.allowedServices.helpText', {
            defaultMessage:
              'Comma, space, or newline separated service names. Leave empty to allow any service permitted by the service account.',
          }),
        }),
      allowedRegions: z
        .string()
        .optional()
        .describe('GCP regions this connector may expose to sandboxed CLI runs')
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.gcpCli.config.allowedRegions.label', {
            defaultMessage: 'Allowed regions',
          }),
          placeholder: 'us-central1, europe-west1',
          helpText: i18n.translate('connectorSpecs.gcpCli.config.allowedRegions.helpText', {
            defaultMessage:
              'Comma, space, or newline separated regions. Leave empty when region scoping is not required.',
          }),
        }),
    })
  ),

  actions: {
    describeAccess: {
      isTool: true,
      description:
        'Describe the Google Cloud CLI access policy configured on this connector. This does not return credentials.',
      input: lazySchema(() => z.object({})),
      handler: async (ctx) => {
        const config = ctx.config as {
          projectId?: string;
          allowedServices?: string;
          allowedRegions?: string;
        };
        return {
          projectId: config.projectId,
          allowedServices: parseCsv(config.allowedServices),
          allowedRegions: parseCsv(config.allowedRegions),
        };
      },
    },
  },

  test: {
    handler: async (ctx) => {
      const serviceAccountJson = ctx.secrets?.serviceAccountJson;
      if (typeof serviceAccountJson !== 'string') {
        return { ok: false, message: 'Missing service account JSON' };
      }

      const serviceAccount = parseServiceAccountKey(serviceAccountJson);
      const configuredProject = (ctx.config as { projectId?: string }).projectId;
      if (configuredProject && serviceAccount.project_id !== configuredProject) {
        return {
          ok: true,
          message:
            `Service account ${serviceAccount.client_email} is valid. ` +
            `It belongs to ${serviceAccount.project_id}, while the connector targets ${configuredProject}.`,
        };
      }

      return {
        ok: true,
        message: `Service account ${serviceAccount.client_email} is valid for Google Cloud CLI setup.`,
      };
    },
    description: i18n.translate('connectorSpecs.gcpCli.test.description', {
      defaultMessage: 'Validates the Google Cloud service account JSON used for CLI setup',
    }),
  },
};
