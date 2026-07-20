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
import { getGcpAccessToken, parseServiceAccountKey } from '../../auth_types/gcp_jwt_helpers';

const GCP_CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const IAM_CREDENTIALS_BASE_URL = 'https://iamcredentials.googleapis.com/v1';

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

const normalizeList = (values?: string[]): string[] => [
  ...new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean)),
];

const missingAllowedValues = (requested: string[] | undefined, allowed: string[]): string[] => {
  if (!requested?.length || allowed.length === 0) {
    return [];
  }
  const normalizedAllowed = new Set(allowed.map((value) => value.toLowerCase()));
  return normalizeList(requested).filter((value) => !normalizedAllowed.has(value));
};

const mintSandboxTokenInputSchema = lazySchema(() =>
  z.object({
    projectId: z.string().optional(),
    access: z.enum(['read', 'write']).optional(),
    services: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional(),
  })
);

interface MintSandboxTokenInput {
  projectId?: string;
  access?: 'read' | 'write';
  services?: string[];
  regions?: string[];
}

const generateAccessToken = async ({
  bootstrapAccessToken,
  targetServiceAccount,
}: {
  bootstrapAccessToken: string;
  targetServiceAccount: string;
}): Promise<{ accessToken: string; expiresAt: number }> => {
  const response = await fetch(
    `${IAM_CREDENTIALS_BASE_URL}/projects/-/serviceAccounts/${encodeURIComponent(
      targetServiceAccount
    )}:generateAccessToken`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bootstrapAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scope: [GCP_CLOUD_PLATFORM_SCOPE],
        lifetime: '3600s',
      }),
    }
  );
  if (!response.ok) {
    throw new Error(
      `GCP IAM Credentials generateAccessToken failed (${
        response.status
      }): ${await response.text()}`
    );
  }
  const data = (await response.json()) as { accessToken?: string; expireTime?: string };
  if (!data.accessToken) {
    throw new Error('GCP IAM Credentials generateAccessToken did not return an accessToken');
  }
  return {
    accessToken: data.accessToken,
    expiresAt: data.expireTime ? Date.parse(data.expireTime) : Date.now() + 3600_000,
  };
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
      targetServiceAccount: z
        .string()
        .optional()
        .describe('Optional service account to impersonate for short-lived sandbox tokens')
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.gcpCli.config.targetServiceAccount.label', {
            defaultMessage: 'Target service account',
          }),
          placeholder: 'agent-reader@my-gcp-project.iam.gserviceaccount.com',
          helpText: i18n.translate('connectorSpecs.gcpCli.config.targetServiceAccount.helpText', {
            defaultMessage:
              'The service account Kibana should impersonate with IAM Credentials. The configured service account key must be allowed to generate access tokens for it.',
          }),
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
          targetServiceAccount?: string;
          allowedServices?: string;
          allowedRegions?: string;
        };
        return {
          projectId: config.projectId,
          targetServiceAccount: config.targetServiceAccount,
          allowedServices: parseCsv(config.allowedServices),
          allowedRegions: parseCsv(config.allowedRegions),
        };
      },
    },
    mintSandboxToken: {
      isTool: false,
      description:
        'Mint a short-lived Google Cloud access token for sandboxed gcloud use. Internal Agent Builder action; not exposed to LLM tools.',
      input: mintSandboxTokenInputSchema,
      handler: async (ctx, input: MintSandboxTokenInput) => {
        const config = ctx.config as {
          projectId?: string;
          targetServiceAccount?: string;
          allowedServices?: string;
          allowedRegions?: string;
        };
        const serviceAccountJson = ctx.secrets?.serviceAccountJson;
        if (typeof serviceAccountJson !== 'string') {
          throw new Error('Missing service account JSON');
        }

        const serviceAccount = parseServiceAccountKey(serviceAccountJson);
        const projectId = input.projectId ?? config.projectId ?? serviceAccount.project_id;
        if (!projectId) {
          throw new Error('Google Cloud CLI connector requires a projectId');
        }
        if (config.projectId && input.projectId && input.projectId !== config.projectId) {
          throw new Error(
            `Google Cloud CLI connector targets ${config.projectId}, not ${input.projectId}`
          );
        }

        const deniedServices = missingAllowedValues(
          input.services,
          parseCsv(config.allowedServices)
        );
        if (deniedServices.length > 0) {
          throw new Error(
            `Google Cloud CLI connector does not allow services: ${deniedServices.join(', ')}`
          );
        }

        const deniedRegions = missingAllowedValues(input.regions, parseCsv(config.allowedRegions));
        if (deniedRegions.length > 0) {
          throw new Error(
            `Google Cloud CLI connector does not allow regions: ${deniedRegions.join(', ')}`
          );
        }

        const targetServiceAccount =
          typeof config.targetServiceAccount === 'string' && config.targetServiceAccount.trim()
            ? config.targetServiceAccount.trim()
            : serviceAccount.client_email;
        const bootstrapToken = await getGcpAccessToken(
          serviceAccount.client_email,
          serviceAccount.private_key,
          GCP_CLOUD_PLATFORM_SCOPE
        );
        const minted = await generateAccessToken({
          bootstrapAccessToken: bootstrapToken.accessToken,
          targetServiceAccount,
        });

        return {
          accessToken: minted.accessToken,
          expiresAt: minted.expiresAt,
          projectId,
          targetServiceAccount,
          source: 'gcp_cli_connector_token',
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
