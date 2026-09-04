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
import type {
  AccessSecretVersionInput,
  AccessSecretVersionResponse,
  AddSecretVersionInput,
  CreateSecretInput,
  DeleteSecretInput,
  GetSecretIamPolicyInput,
  GetSecretInput,
  GetSecretVersionInput,
  IamPolicyResponse,
  ListSecretVersionsInput,
  ListSecretsInput,
  SecretResponse,
  SecretVersionActionInput,
  SecretVersionResponse,
  SetSecretIamPolicyInput,
  UpdateSecretInput,
} from './types';
import {
  AccessSecretVersionInputSchema,
  AddSecretVersionInputSchema,
  CreateSecretInputSchema,
  DeleteSecretInputSchema,
  GetSecretIamPolicyInputSchema,
  GetSecretInputSchema,
  GetSecretVersionInputSchema,
  ListSecretVersionsInputSchema,
  ListSecretsInputSchema,
  SecretVersionActionInputSchema,
  SetSecretIamPolicyInputSchema,
  UpdateSecretInputSchema,
} from './types';

const SECRET_MANAGER_API = 'https://secretmanager.googleapis.com/v1';

/**
 * Build a secret's resource path from individually encoded segments. The slashes between
 * `projects`, `secrets` and `versions` are structural: percent-encoding an assembled resource
 * name makes the API return 404 (verified live), so only the caller-supplied segments are encoded.
 */
const secretPath = (projectId: string, secretId: string): string =>
  `${SECRET_MANAGER_API}/projects/${encodeURIComponent(projectId)}/secrets/${encodeURIComponent(
    secretId
  )}`;

const versionPath = (projectId: string, secretId: string, version: string): string =>
  `${secretPath(projectId, secretId)}/versions/${encodeURIComponent(version)}`;

/**
 * Google's APIs expect a repeated query parameter for a list value (`filter=a&filter=b`). Axios
 * defaults to the bracket form (`filter[]=a`), which Google rejects outright with
 * `Unknown name "filter[]": Cannot bind query parameter` (confirmed against the live Secret
 * Manager API), so every action that passes params uses this serializer.
 */
const serializeRepeatedParams = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        search.append(key, String(entry));
      }
    } else {
      search.append(key, String(value));
    }
  }
  return search.toString();
};

/**
 * Surface Google's own error payload. The `status` and `message` fields carry the actionable
 * detail (which permission was missing, which field was malformed); an unwrapped axios message
 * says only "Request failed with status code 403".
 */
const throwWithApiError = (error: unknown): never => {
  const axiosError = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  const data = axiosError.response?.data as
    | { error?: { message?: string; status?: string } }
    | undefined;
  if (data?.error?.message) {
    const status = data.error.status ? ` [${data.error.status}]` : '';
    throw new Error(
      `Google Cloud Secret Manager API error (${axiosError.response?.status})${status}: ${data.error.message}`
    );
  }
  if (axiosError.response?.data !== undefined) {
    throw new Error(
      `Google Cloud Secret Manager API error (${axiosError.response?.status}): ${JSON.stringify(
        axiosError.response.data
      )}`
    );
  }
  throw error;
};

/** The last path segment of a resource name, e.g. the version number or the secret id. */
const lastSegment = (name: string | undefined): string | undefined => name?.split('/').pop();

/**
 * Explicit field selection on a secret. The API omits unset fields entirely rather than
 * returning null, so the optional ones are normalized to a predictable shape for a workflow.
 */
const trimSecret = (secret: SecretResponse) => ({
  name: secret.name,
  secretId: lastSegment(secret.name),
  createTime: secret.createTime,
  labels: secret.labels ?? {},
  annotations: secret.annotations ?? {},
  versionAliases: secret.versionAliases ?? {},
  replication: secret.replication?.userManaged
    ? {
        type: 'user-managed' as const,
        locations: (secret.replication.userManaged.replicas ?? [])
          .map((replica) => replica.location)
          .filter((location): location is string => location !== undefined),
      }
    : { type: 'automatic' as const, locations: [] },
  rotation: secret.rotation
    ? {
        nextRotationTime: secret.rotation.nextRotationTime,
        rotationPeriod: secret.rotation.rotationPeriod,
      }
    : undefined,
  ttl: secret.ttl,
  expireTime: secret.expireTime,
  topics: (secret.topics ?? [])
    .map((topic) => topic.name)
    .filter((name): name is string => name !== undefined),
  etag: secret.etag,
});

/** Explicit field selection on a version. Never carries payload material. */
const trimSecretVersion = (version: SecretVersionResponse) => ({
  name: version.name,
  version: lastSegment(version.name),
  state: version.state,
  createTime: version.createTime,
  destroyTime: version.destroyTime,
  scheduledDestroyTime: version.scheduledDestroyTime,
  etag: version.etag,
});

const trimPolicy = (policy: IamPolicyResponse) => ({
  version: policy.version,
  etag: policy.etag,
  bindings: (policy.bindings ?? []).map((binding) => ({
    role: binding.role,
    members: binding.members ?? [],
    ...(binding.condition ? { condition: binding.condition } : {}),
  })),
});

/**
 * Turn the fields a caller actually set into the `updateMask` the PATCH endpoint requires. The
 * mask is mandatory, and an empty one is rejected, which is why the input schema refines to
 * require at least one field.
 */
const buildSecretUpdate = (
  input: UpdateSecretInput
): { body: Record<string, unknown>; updateMask: string[] } => {
  const body: Record<string, unknown> = {};
  const updateMask: string[] = [];

  if (input.labels !== undefined) {
    body.labels = input.labels;
    updateMask.push('labels');
  }
  if (input.versionAliases !== undefined) {
    body.versionAliases = input.versionAliases;
    updateMask.push('version_aliases');
  }
  if (input.ttl !== undefined) {
    body.ttl = input.ttl;
    updateMask.push('ttl');
  }
  if (input.expireTime !== undefined) {
    body.expireTime = input.expireTime;
    updateMask.push('expire_time');
  }
  // Rotation is a single nested message, so each half is masked on its own path; masking
  // `rotation` wholesale would clear the sibling field the caller did not send.
  if (input.nextRotationTime !== undefined || input.rotationPeriod !== undefined) {
    const rotation: Record<string, string> = {};
    if (input.nextRotationTime !== undefined) {
      rotation.nextRotationTime = input.nextRotationTime;
      updateMask.push('rotation.next_rotation_time');
    }
    if (input.rotationPeriod !== undefined) {
      rotation.rotationPeriod = input.rotationPeriod;
      updateMask.push('rotation.rotation_period');
    }
    body.rotation = rotation;
  }

  return { body, updateMask };
};

export const GcpSecretManager: ConnectorSpec = {
  metadata: {
    id: '.gcp_secret_manager',
    displayName: 'Google Cloud Secret Manager',
    description: i18n.translate('core.kibanaConnectorSpecs.gcpSecretManager.metadata.description', {
      defaultMessage:
        'List and inspect secrets, add and disable versions, and read access policy in Google Cloud Secret Manager',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['gcp_service_account'],
  },

  schema: lazySchema(() =>
    z.object({
      defaultProjectId: z
        .string()
        .max(30)
        .optional()
        .describe('Optional default Google Cloud project id used when an action omits one')
        .meta({
          label: i18n.translate(
            'core.kibanaConnectorSpecs.gcpSecretManager.config.defaultProjectId',
            { defaultMessage: 'Default project ID' }
          ),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.gcpSecretManager.config.defaultProjectIdHelp',
            {
              defaultMessage:
                'Optional, for example my-project-123. Every action takes an explicit project id, but the Test connector button needs this field to have a project to list secrets in.',
            }
          ),
          placeholder: 'my-project-123',
        }),
    })
  ),

  skill: `Google Cloud Secret Manager stores secret values as immutable versions under a named secret container. Use this connector to inspect secrets and to drive credential rotation and revocation.

Read the secret value at runtime:
1. accessSecretVersion with revealPayload: true is the ONLY way to obtain a secret value. By default the action deliberately withholds it and returns metadata plus a checksum instead.
2. Think before setting revealPayload. The returned value is written into the workflow execution record and is readable by anyone who can read that execution. Prefer passing the secret straight into the step that needs it, and never route it through a console step or an agent response.
3. Agent Builder cannot call accessSecretVersion at all: it is not exposed as a tool. That is intentional.

Rotation flow, the main reason this connector exists:
1. listSecretVersions to see what exists and which versions are ENABLED.
2. addSecretVersion with the freshly minted credential. This creates a new version and makes it "latest"; it does not disable the old one.
3. Deploy the new credential to whatever consumes it.
4. disableSecretVersion on the OLD version number. Reversible, so this is the safe first revocation step.
5. If something breaks, enableSecretVersion puts the old version straight back.
6. destroySecretVersion once you are confident. This is permanent and unrecoverable.

Gotchas:
- A secret is a container and holds no value of its own. createSecret then addSecretVersion is the full provisioning sequence; a secret with no versions cannot be accessed.
- "latest" resolves to the newest ENABLED version, so it moves when you add or disable one. For a lifecycle change always pass an explicit version number, or a concurrent addVersion can redirect the call to the wrong version.
- Disabling every version leaves the secret unreadable and accessSecretVersion then fails. That is a valid full-revocation move, not an error.
- destroySecretVersion cannot be undone. The version stays listed with state DESTROYED as an audit record, but the value is gone.
- updateSecret REPLACES the labels and versionAliases maps rather than merging them, so read the current values with getSecret first.
- getSecret returns the secret name using the project NUMBER, not the project id you passed. Do not feed that name back in as an id.
- A secret's own IAM policy is often empty because access is inherited from the project. An empty bindings list from getSecretIamPolicy does NOT mean nobody can read the secret.
- Reads need roles/secretmanager.viewer, reading a value needs roles/secretmanager.secretAccessor, and version lifecycle changes need roles/secretmanager.secretVersionManager.`,

  actions: {
    listSecrets: {
      isTool: true,
      scope: 'read',
      description:
        'List the secrets in a Google Cloud project, with id, labels, replication, rotation policy and version aliases. ' +
        'The orientation tool: use it to discover what secrets exist when you have a project but not an exact secret id. ' +
        'Returns metadata only and never a secret value. Paginates: keep passing nextPageToken until it is absent.',
      input: ListSecretsInputSchema,
      handler: async (ctx, input: ListSecretsInput) => {
        try {
          const response = await ctx.client.get(
            `${SECRET_MANAGER_API}/projects/${encodeURIComponent(input.projectId)}/secrets`,
            {
              params: {
                filter: input.filter,
                pageSize: input.pageSize,
                pageToken: input.pageToken,
              },
              paramsSerializer: serializeRepeatedParams,
            }
          );
          const data = response.data as {
            secrets?: SecretResponse[];
            nextPageToken?: string;
            totalSize?: number;
          };
          return {
            secrets: (data.secrets ?? []).map(trimSecret),
            nextPageToken: data.nextPageToken,
            totalSize: data.totalSize,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getSecret: {
      isTool: true,
      scope: 'read',
      description:
        'Get one secret container by id: labels, replication policy, rotation schedule, TTL, expiry, version aliases and etag. ' +
        'Use it to inspect configuration before acting, for example to read the current labels or aliases that updateSecret would replace. ' +
        'Returns metadata only and never a secret value. Note the returned name uses the project number rather than the project id.',
      input: GetSecretInputSchema,
      handler: async (ctx, input: GetSecretInput) => {
        try {
          const response = await ctx.client.get(secretPath(input.projectId, input.secretId));
          return trimSecret(response.data as SecretResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    listSecretVersions: {
      isTool: true,
      scope: 'read',
      description:
        'List the versions of a secret with each version number and its state (ENABLED, DISABLED or DESTROYED). ' +
        'The triage read a rotation depends on: use it to find which old versions to disable or destroy, and to confirm a lifecycle change landed. ' +
        'Returns metadata only and never a secret value. Paginates: keep passing nextPageToken until it is absent.',
      input: ListSecretVersionsInputSchema,
      handler: async (ctx, input: ListSecretVersionsInput) => {
        try {
          const response = await ctx.client.get(
            `${secretPath(input.projectId, input.secretId)}/versions`,
            {
              params: {
                filter: input.filter,
                pageSize: input.pageSize,
                pageToken: input.pageToken,
              },
              paramsSerializer: serializeRepeatedParams,
            }
          );
          const data = response.data as {
            versions?: SecretVersionResponse[];
            nextPageToken?: string;
            totalSize?: number;
          };
          return {
            versions: (data.versions ?? []).map(trimSecretVersion),
            nextPageToken: data.nextPageToken,
            totalSize: data.totalSize,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getSecretVersion: {
      isTool: true,
      scope: 'read',
      description:
        'Get the metadata of one secret version: its state, creation time and scheduled destroy time. ' +
        'Use it to check whether a specific version is still ENABLED before relying on it, or to confirm a disable or destroy took effect. ' +
        'This does NOT return the secret value; accessSecretVersion is the only action that can. Version defaults to "latest".',
      input: GetSecretVersionInputSchema,
      handler: async (ctx, input: GetSecretVersionInput) => {
        try {
          const response = await ctx.client.get(
            versionPath(input.projectId, input.secretId, input.version)
          );
          return trimSecretVersion(response.data as SecretVersionResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    accessSecretVersion: {
      // Returns live credential material when opted in, so an agent must never be able to call
      // it autonomously. Workflow-only, and even there the payload is withheld by default.
      isTool: false,
      scope: 'read',
      description:
        'Read a secret version and verify it, optionally returning the secret value itself. ' +
        'By DEFAULT the value is withheld and the action returns only metadata plus an integrity signal (the byte length and the API crc32c), which is enough to confirm a rotation landed without exposing the secret. ' +
        'Set revealPayload: true to get the decoded value in `payload`. WARNING: doing so writes the live secret into the workflow execution record, where anyone who can read that execution can read the secret, so only opt in when the value is passed directly to the step that needs it, and never into a console step or an agent response. ' +
        'Version defaults to "latest", which resolves to the newest enabled version.',
      input: AccessSecretVersionInputSchema,
      handler: async (ctx, input: AccessSecretVersionInput) => {
        try {
          const response = await ctx.client.get(
            `${versionPath(input.projectId, input.secretId, input.version)}:access`
          );
          const data = response.data as AccessSecretVersionResponse;
          const encoded = data.payload?.data;
          const decoded = encoded ? Buffer.from(encoded, 'base64') : undefined;

          // The payload is dropped unless the caller explicitly asked for it. The byte length and
          // the API's own crc32c let a workflow tell that a value changed without surfacing it.
          // Note that no digest of the value is returned: a secret is often low-entropy enough
          // that an unsalted hash in an execution record would itself be brute-forceable, so
          // publishing one would reintroduce the leak this action exists to avoid.
          return {
            name: data.name,
            version: lastSegment(data.name),
            dataCrc32c: data.payload?.dataCrc32c,
            payloadBytes: decoded?.length ?? 0,
            payloadIncluded: input.revealPayload === true,
            ...(input.revealPayload === true
              ? { payload: decoded ? decoded.toString('utf8') : undefined }
              : {}),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    addSecretVersion: {
      // Writes new credential material; a wrong target silently becomes the value consumers read.
      isTool: false,
      scope: 'write',
      description:
        'Store a new version of a secret, which becomes the new "latest". The create half of a rotation: this is how a workflow saves a freshly minted credential. ' +
        'It does NOT disable the previous version, so deploy the new value first and then call disableSecretVersion on the old version number. ' +
        'Pass the value as plain text; the connector base64-encodes it. Returns the new version number and state, never the value back.',
      input: AddSecretVersionInputSchema,
      handler: async (ctx, input: AddSecretVersionInput) => {
        try {
          const response = await ctx.client.post(
            `${secretPath(input.projectId, input.secretId)}:addVersion`,
            { payload: { data: Buffer.from(input.payload, 'utf8').toString('base64') } }
          );
          return trimSecretVersion(response.data as SecretVersionResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    disableSecretVersion: {
      isTool: false,
      scope: 'destroy',
      description:
        'Disable one secret version so it can no longer be accessed, without destroying it. The safe, reversible first step of a rotate-and-revoke workflow, and the rollback is enableSecretVersion. ' +
        'Anything still reading this version starts failing immediately, so confirm with listSecretVersions first. ' +
        'Pass an explicit version number rather than "latest", since "latest" moves when a version is added.',
      input: SecretVersionActionInputSchema,
      handler: async (ctx, input: SecretVersionActionInput) => {
        try {
          const response = await ctx.client.post(
            `${versionPath(input.projectId, input.secretId, input.version)}:disable`,
            input.etag ? { etag: input.etag } : {}
          );
          return trimSecretVersion(response.data as SecretVersionResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    enableSecretVersion: {
      isTool: false,
      scope: 'destroy',
      description:
        'Re-enable a previously disabled secret version so it can be accessed again. The rollback path when a rotation broke a consumer and the old credential needs to work again. ' +
        'Only works on a DISABLED version: a DESTROYED version is gone permanently and cannot be enabled.',
      input: SecretVersionActionInputSchema,
      handler: async (ctx, input: SecretVersionActionInput) => {
        try {
          const response = await ctx.client.post(
            `${versionPath(input.projectId, input.secretId, input.version)}:enable`,
            input.etag ? { etag: input.etag } : {}
          );
          return trimSecretVersion(response.data as SecretVersionResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    destroySecretVersion: {
      // Irreversible destruction of credential material.
      isTool: false,
      scope: 'destroy',
      description:
        'Permanently destroy the value of a secret version. The terminal revocation step for a leaked or superseded credential and NOT reversible, unlike disableSecretVersion. ' +
        'The version remains listed with state DESTROYED as an audit record, but the value is unrecoverable. ' +
        'Disable first and destroy only once you are certain nothing still needs it.',
      input: SecretVersionActionInputSchema,
      handler: async (ctx, input: SecretVersionActionInput) => {
        try {
          const response = await ctx.client.post(
            `${versionPath(input.projectId, input.secretId, input.version)}:destroy`,
            input.etag ? { etag: input.etag } : {}
          );
          return trimSecretVersion(response.data as SecretVersionResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    createSecret: {
      isTool: false,
      scope: 'write',
      description:
        'Create an empty secret container. Pair it with addSecretVersion to provision a brand-new credential, since a secret with no versions holds no value and cannot be accessed. ' +
        'Replication defaults to "automatic", which lets Google choose regions; use "user-managed" with replicaLocations when data residency requires pinned regions. ' +
        'An optional ttl deletes the secret automatically, which suits a short-lived break-glass credential.',
      input: CreateSecretInputSchema,
      handler: async (ctx, input: CreateSecretInput) => {
        // Validated before the request is built so the caller gets this message rather than the
        // API's less specific complaint about an empty replica list.
        if (input.replication === 'user-managed' && (input.replicaLocations ?? []).length === 0) {
          throw new Error(
            'replicaLocations must list at least one region when replication is "user-managed".'
          );
        }

        const replication =
          input.replication === 'user-managed'
            ? {
                userManaged: {
                  replicas: (input.replicaLocations ?? []).map((location) => ({ location })),
                },
              }
            : { automatic: {} };

        try {
          const response = await ctx.client.post(
            `${SECRET_MANAGER_API}/projects/${encodeURIComponent(input.projectId)}/secrets`,
            {
              replication,
              ...(input.labels ? { labels: input.labels } : {}),
              ...(input.ttl ? { ttl: input.ttl } : {}),
            },
            {
              // secretId is a query parameter on this endpoint, not a body field.
              params: { secretId: input.secretId },
              paramsSerializer: serializeRepeatedParams,
            }
          );
          return trimSecret(response.data as SecretResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    updateSecret: {
      isTool: false,
      scope: 'destroy',
      description:
        'Update a secret container: labels, TTL or expiry, version aliases, and the rotation schedule. Use it to tag a secret or to re-schedule rotation. ' +
        'Only the fields you set are changed, but labels and versionAliases are REPLACED wholesale rather than merged, so read the current values with getSecret first. ' +
        'Cannot change a secret value; that is addSecretVersion.',
      input: UpdateSecretInputSchema,
      handler: async (ctx, input: UpdateSecretInput) => {
        try {
          const { body, updateMask } = buildSecretUpdate(input);
          const response = await ctx.client.patch(
            secretPath(input.projectId, input.secretId),
            body,
            {
              // updateMask is required by the API and is a query param, not a body field.
              params: { updateMask: updateMask.join(',') },
              paramsSerializer: serializeRepeatedParams,
            }
          );
          return trimSecret(response.data as SecretResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    deleteSecret: {
      // Deletes the container and every version in it, with no undelete.
      isTool: false,
      scope: 'destroy',
      description:
        'Delete a secret and ALL of its versions permanently. The cleanup step when decommissioning, and there is no undelete. ' +
        'Everything reading any version of this secret breaks immediately. ' +
        'For revocation prefer disableSecretVersion, which is reversible and leaves the audit trail intact. Pass an etag to fail if the secret changed since you read it.',
      input: DeleteSecretInputSchema,
      handler: async (ctx, input: DeleteSecretInput) => {
        try {
          await ctx.client.delete(secretPath(input.projectId, input.secretId), {
            params: input.etag ? { etag: input.etag } : {},
            paramsSerializer: serializeRepeatedParams,
          });
          return { deleted: true, secretId: input.secretId };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getSecretIamPolicy: {
      isTool: true,
      scope: 'read',
      description:
        'Read the IAM policy attached directly to one secret: every role binding with its members, any IAM conditions, and the etag. ' +
        'Use it in an access audit to see who was granted access to this specific secret, and to get the etag that setSecretIamPolicy needs. ' +
        'IMPORTANT: an empty bindings list does NOT mean nobody can read the secret, because access is usually inherited from the project. Check the project policy too. ' +
        'Requests policy version 3 so conditional bindings are visible rather than silently omitted.',
      input: GetSecretIamPolicyInputSchema,
      handler: async (ctx, input: GetSecretIamPolicyInput) => {
        try {
          const response = await ctx.client.get(
            `${secretPath(input.projectId, input.secretId)}:getIamPolicy`,
            {
              // Unlike the Cloud Resource Manager equivalent this is a GET, and the policy
              // version is a query param rather than a JSON body.
              params: { 'options.requestedPolicyVersion': 3 },
              paramsSerializer: serializeRepeatedParams,
            }
          );
          return trimPolicy(response.data as IamPolicyResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    setSecretIamPolicy: {
      // Replaces the whole policy on the secret: the highest-blast-radius action here.
      isTool: false,
      scope: 'destroy',
      description:
        'Replace the entire IAM policy on one secret in a single call, to grant or revoke accessor bindings during a remediation. ' +
        'This REPLACES every binding, so any binding missing from the input is revoked. Always build the bindings from a getSecretIamPolicy response and pass back its etag. ' +
        'Revoking a binding here does not remove access inherited from the project, so check the project policy as well when locking a secret down.',
      input: SetSecretIamPolicyInputSchema,
      handler: async (ctx, input: SetSecretIamPolicyInput) => {
        try {
          const response = await ctx.client.post(
            `${secretPath(input.projectId, input.secretId)}:setIamPolicy`,
            {
              policy: {
                version: input.version ?? 3,
                bindings: input.bindings,
                etag: input.etag,
              },
            }
          );
          return trimPolicy(response.data as IamPolicyResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.gcpSecretManager.test.description', {
      defaultMessage:
        'Verifies the Google Cloud Secret Manager connection by listing secrets in the configured project',
    }),
    handler: async (ctx) => {
      const projectId = ctx.config?.defaultProjectId as string | undefined;
      if (!projectId) {
        throw new Error(
          'Set the "Default project ID" configuration field to test this connector, so the test has a project to list secrets in.'
        );
      }
      try {
        // A single-item list is the cheapest authenticated read that proves both that the
        // credentials are valid and that the project is reachable.
        await ctx.client.get(
          `${SECRET_MANAGER_API}/projects/${encodeURIComponent(projectId)}/secrets`,
          { params: { pageSize: 1 }, paramsSerializer: serializeRepeatedParams }
        );
        // Resolving is what signals success; the framework's result type forbids an `ok`
        // field, so a failure must throw rather than return ok: false.
        return {
          message: 'Successfully connected to the Google Cloud Secret Manager API',
        };
      } catch (error) {
        return throwWithApiError(error);
      }
    },
  },
};
