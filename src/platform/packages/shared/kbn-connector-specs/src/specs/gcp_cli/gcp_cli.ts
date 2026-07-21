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
import type { ActionContext, ConnectorSpec, SandboxCliToken } from '../../connector_spec';
import { getGcpAccessToken, parseServiceAccountKey } from '../../auth_types/gcp_jwt_helpers';

const GCP_CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const IAM_CREDENTIALS_BASE_URL = 'https://iamcredentials.googleapis.com/v1';
const WORKSPACE = '/workspace';
const GCP_CLI_CONFIG_DIR = `${WORKSPACE}/.gcloud`;
const GCP_CLI_CREDENTIAL_DIR = `${WORKSPACE}/.gcp`;
const GCP_CLI_ACCESS_TOKEN_PATH = `${GCP_CLI_CREDENTIAL_DIR}/access-token`;
const GCP_CLI_SDK_DIR = `${WORKSPACE}/.google-cloud-sdk`;
const SANDBOX_CLI_BIN_DIR = `${WORKSPACE}/.sandbox-cli-bin`;
const GCP_CLI_PYTHON_PATH = `${SANDBOX_CLI_BIN_DIR}/python`;
const UV_PYTHON_INSTALL_DIR = `${WORKSPACE}/.uv-python`;

const installGcloudCommand = [
  'set -e',
  `mkdir -p '${GCP_CLI_SDK_DIR}' '${SANDBOX_CLI_BIN_DIR}'`,
  `if [ ! -x '${GCP_CLI_SDK_DIR}/bin/gcloud' ]; then`,
  `  arch="$(uname -m)"`,
  `  case "$arch" in`,
  `    x86_64|amd64) sdk_arch="x86_64" ;;`,
  `    aarch64|arm64) sdk_arch="arm" ;;`,
  `    *) echo "Unsupported architecture for Google Cloud CLI: $arch" >&2; exit 1 ;;`,
  `  esac`,
  `  tmp="$(mktemp -d)"`,
  `  curl -fsSL "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-\${sdk_arch}.tar.gz" -o "$tmp/google-cloud-cli.tar.gz"`,
  `  tar -xzf "$tmp/google-cloud-cli.tar.gz" -C "$tmp"`,
  `  rm -rf '${GCP_CLI_SDK_DIR}'`,
  `  mv "$tmp/google-cloud-sdk" '${GCP_CLI_SDK_DIR}'`,
  `  rm -rf "$tmp"`,
  `fi`,
  `if [ -x '${GCP_CLI_SDK_DIR}/platform/bundledpythonunix/bin/python3' ]; then`,
  `  ln -sf '${GCP_CLI_SDK_DIR}/platform/bundledpythonunix/bin/python3' '${GCP_CLI_PYTHON_PATH}'`,
  `elif [ -x '${GCP_CLI_SDK_DIR}/platform/bundledpythonunix/bin/python' ]; then`,
  `  ln -sf '${GCP_CLI_SDK_DIR}/platform/bundledpythonunix/bin/python' '${GCP_CLI_PYTHON_PATH}'`,
  `elif command -v python3 >/dev/null 2>&1; then`,
  `  ln -sf "$(command -v python3)" '${GCP_CLI_PYTHON_PATH}'`,
  `elif command -v python >/dev/null 2>&1; then`,
  `  ln -sf "$(command -v python)" '${GCP_CLI_PYTHON_PATH}'`,
  `else`,
  `  export UV_INSTALL_DIR='${SANDBOX_CLI_BIN_DIR}'`,
  `  export UV_PYTHON_INSTALL_DIR='${UV_PYTHON_INSTALL_DIR}'`,
  `  curl -LsSf https://astral.sh/uv/install.sh | sh`,
  `  '${SANDBOX_CLI_BIN_DIR}/uv' python install 3.12`,
  `  uv_python="$('${SANDBOX_CLI_BIN_DIR}/uv' python find 3.12)"`,
  `  ln -sf "$uv_python" '${GCP_CLI_PYTHON_PATH}'`,
  `fi`,
  `ln -sf '${GCP_CLI_SDK_DIR}/bin/gcloud' '${SANDBOX_CLI_BIN_DIR}/gcloud'`,
  `[ -x '${GCP_CLI_SDK_DIR}/bin/gsutil' ] && ln -sf '${GCP_CLI_SDK_DIR}/bin/gsutil' '${SANDBOX_CLI_BIN_DIR}/gsutil' || true`,
  `CLOUDSDK_PYTHON='${GCP_CLI_PYTHON_PATH}' '${GCP_CLI_SDK_DIR}/bin/gcloud' --version`,
  `CLOUDSDK_PYTHON='${GCP_CLI_PYTHON_PATH}' CLOUDSDK_CONFIG='${GCP_CLI_CONFIG_DIR}' CLOUDSDK_AUTH_ACCESS_TOKEN_FILE='${GCP_CLI_ACCESS_TOKEN_PATH}' '${GCP_CLI_SDK_DIR}/bin/gcloud' config set auth/access_token_file '${GCP_CLI_ACCESS_TOKEN_PATH}' --quiet`,
  `CLOUDSDK_PYTHON='${GCP_CLI_PYTHON_PATH}' CLOUDSDK_CONFIG='${GCP_CLI_CONFIG_DIR}' CLOUDSDK_AUTH_ACCESS_TOKEN_FILE='${GCP_CLI_ACCESS_TOKEN_PATH}' '${GCP_CLI_SDK_DIR}/bin/gcloud' auth print-access-token --quiet >/dev/null`,
].join('\n');

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

type MintSandboxTokenResponse = SandboxCliToken;

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

const describeAccess = async (ctx: ActionContext) => {
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
};

const mintSandboxToken = async (
  ctx: ActionContext,
  input: MintSandboxTokenInput
): Promise<MintSandboxTokenResponse> => {
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

  const deniedServices = missingAllowedValues(input.services, parseCsv(config.allowedServices));
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
    source: 'gcp_cli_connector_token',
    expiresAt: minted.expiresAt,
    env: {
      CLOUDSDK_CONFIG: GCP_CLI_CONFIG_DIR,
      CLOUDSDK_AUTH_ACCESS_TOKEN_FILE: GCP_CLI_ACCESS_TOKEN_PATH,
      CLOUDSDK_CORE_PROJECT: projectId,
      CLOUDSDK_PYTHON: GCP_CLI_PYTHON_PATH,
    },
    files: [
      {
        path: GCP_CLI_ACCESS_TOKEN_PATH,
        contents: minted.accessToken,
        mode: '0600',
      },
      {
        path: `${GCP_CLI_CONFIG_DIR}/configurations/config_default`,
        contents: `[core]\nproject = ${projectId}\ndisable_usage_reporting = true\n[auth]\naccess_token_file = ${GCP_CLI_ACCESS_TOKEN_PATH}\n`,
        mode: '0600',
      },
    ],
    setupCommands: [installGcloudCommand],
    cleanupPaths: [GCP_CLI_CONFIG_DIR, GCP_CLI_CREDENTIAL_DIR, UV_PYTHON_INSTALL_DIR],
  };
};

export const GcpCliConnector: ConnectorSpec = {
  metadata: {
    id: '.gcp_cli',
    displayName: 'Google Cloud CLI',
    icon: 'logoGCP',
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
      handler: describeAccess,
    },
    mintSandboxToken: {
      isTool: false,
      description:
        'Mint a short-lived Google Cloud access token for sandboxed gcloud use. Internal Agent Builder action; not exposed to LLM tools.',
      input: mintSandboxTokenInputSchema,
      handler: mintSandboxToken,
    },
  },

  sandboxCli: {
    skill: [
      'Use this connector when the sandbox needs Google Cloud CLI access, including gcloud,',
      'Cloud Run, Cloud Logging, Google Cloud Storage, or generic GCP project inspection.',
      'Ask for project or region when the prompt does not provide them. Use read access unless',
      'the task needs to create, update, or delete GCP resources.',
      'The sandbox uses CLOUDSDK_AUTH_ACCESS_TOKEN_FILE with a short-lived access token;',
      'gcloud auth list may show no credentialed accounts. Verify auth with gcloud auth',
      'print-access-token or a real gcloud API command instead.',
    ].join(' '),
    mintToken: {
      schema: mintSandboxTokenInputSchema,
      handler: mintSandboxToken,
    },
    mintTokenOptions: {
      handler: describeAccess,
    },
    revokeToken: {
      handler: async () => {},
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
