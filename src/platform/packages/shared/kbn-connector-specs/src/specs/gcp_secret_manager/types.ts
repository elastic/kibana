/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * Google bounds and charset-constrains these ids itself. Mirroring those constraints here stops
 * an LLM- or workflow-supplied value from reaching a URL path segment as something unexpected,
 * which matters more than usual on a connector that can read credential material.
 */
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

/** A secret id is 1-255 characters of letters, digits, hyphens and underscores. */
const SECRET_ID_PATTERN = /^[a-zA-Z0-9_-]{1,255}$/;

/**
 * A version is either a positive integer, the literal `latest`, or a user-defined alias.
 * Aliases share the secret-id charset but cannot start with a digit, so `latest` and numbers are
 * matched explicitly rather than folded into one loose pattern.
 */
const VERSION_PATTERN = /^([0-9]{1,19}|latest|[a-zA-Z_][a-zA-Z0-9_-]{0,254})$/;

/** An etag as Secret Manager returns it, including the surrounding quotes. */
const ETAG_PATTERN = /^"?[A-Za-z0-9+/=_-]{1,128}"?$/;

/**
 * An IAM policy member, e.g. `user:a@b.com`, `serviceAccount:x@y.iam.gserviceaccount.com`,
 * `group:g@b.com`, `domain:example.com`, `allUsers`, `allAuthenticatedUsers`, or a
 * `principal://` / `principalSet://` workforce identifier.
 */
const MEMBER_PATTERN =
  /^(allUsers|allAuthenticatedUsers|(user|serviceAccount|group|domain|deleted|principal|principalSet|principalHierarchy):[^\s]{1,512})$/;

/** A role name always carries its prefix: `roles/secretmanager.secretAccessor`. */
const ROLE_NAME_PATTERN =
  /^(roles\/[a-zA-Z0-9_.]+|(projects|organizations)\/[a-z0-9-]+\/roles\/[a-zA-Z0-9_.-]+)$/;

const projectId = () =>
  z
    .string()
    .max(30)
    .regex(PROJECT_ID_PATTERN, {
      message: 'Must be a valid Google Cloud project id, for example my-project-123',
    })
    .describe(
      'Google Cloud project id, for example "my-project-123". Not the project number and not the display name.'
    );

const secretId = () =>
  z
    .string()
    .max(255)
    .regex(SECRET_ID_PATTERN, {
      message:
        'Must be a secret id of letters, digits, hyphens or underscores, for example my-api-key',
    })
    .describe(
      'The secret id, which is the last path segment of the secret name, for example "my-api-key". Obtain it from listSecrets. Not the fully-qualified "projects/.../secrets/..." name.'
    );

const version = () =>
  z
    .string()
    .max(255)
    .regex(VERSION_PATTERN, {
      message: 'Must be a version number, the alias "latest", or a user-defined alias',
    })
    .describe(
      'The version to target: a version number such as "3", the alias "latest" for the newest enabled version, or a user-defined alias. Obtain numbers from listSecretVersions.'
    );

const etag = () =>
  z
    .string()
    .max(128)
    .regex(ETAG_PATTERN, { message: 'Must be an etag as returned by a read action' })
    .optional()
    .describe(
      'Optional etag from a previous read. Supply it to make the call fail rather than act on a version that changed underneath you.'
    );

const pageSize = () =>
  z
    .number()
    .int()
    .min(1)
    .max(25000)
    .optional()
    .describe('Maximum number of items to return per page. Defaults to 25000 server-side.');

const pageToken = () =>
  z
    .string()
    .max(2048)
    .optional()
    .describe(
      'Page token from a previous response. Keep paging while nextPageToken is present to enumerate everything.'
    );

/**
 * Secret Manager's `filter` is a single string in its own documented syntax, not a repeated
 * param, so it is bounded as one string rather than an array.
 */
const filter = () =>
  z
    .string()
    .max(2000)
    .optional()
    .describe(
      'Optional filter in Secret Manager filter syntax, for example "name:api" or "labels.env=prod". Omit to return everything.'
    );

// --- Secret reads ----------------------------------------------------------------------

export const ListSecretsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    filter: filter(),
    pageSize: pageSize(),
    pageToken: pageToken(),
  })
);

export const GetSecretInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId(),
  })
);

// --- Version reads ---------------------------------------------------------------------

export const ListSecretVersionsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId(),
    filter: filter(),
    pageSize: pageSize(),
    pageToken: pageToken(),
  })
);

export const GetSecretVersionInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId(),
    version: version().default('latest'),
  })
);

/**
 * The payload-bearing read. `revealPayload` defaults to false so the secret value is withheld
 * unless a workflow author explicitly asks for it; see the accessSecretVersion handler.
 */
export const AccessSecretVersionInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId(),
    version: version().default('latest'),
    revealPayload: z
      .boolean()
      .optional()
      .describe(
        'Set true to return the decoded secret value in the step output. DANGEROUS: the value is then persisted in the workflow execution record and visible to anyone who can read it. Leave unset to get only metadata plus a checksum, which is enough to verify a rotation without exposing the secret.'
      ),
  })
);

// --- Version lifecycle -----------------------------------------------------------------

export const AddSecretVersionInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId(),
    payload: z
      .string()
      .max(65536)
      .describe(
        'The new secret value as plain UTF-8 text. The connector base64-encodes it for the API, so do not pre-encode. Maximum 64KiB.'
      ),
  })
);

export const SecretVersionActionInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId(),
    version: version().describe(
      'The version number to act on, for example "3". Obtain it from listSecretVersions. Prefer an explicit number over "latest" for a lifecycle change, so a concurrent addVersion cannot redirect the call.'
    ),
    etag: etag(),
  })
);

// --- Secret lifecycle ------------------------------------------------------------------

export const CreateSecretInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId().describe(
      'The id for the new secret, for example "my-api-key". Letters, digits, hyphens and underscores, up to 255 characters.'
    ),
    replication: z
      .enum(['automatic', 'user-managed'])
      .default('automatic')
      .describe(
        'Where Google stores the secret. "automatic" lets Google choose regions and is the usual choice; "user-managed" pins it to the regions given in replicaLocations, which data-residency rules may require.'
      ),
    replicaLocations: z
      .array(
        z
          .string()
          .max(64)
          .regex(/^[a-z0-9-]{1,64}$/, { message: 'Must be a region id such as us-east1' })
      )
      .max(30)
      .optional()
      .describe(
        'Regions to replicate to, for example ["us-east1","europe-west1"]. Required when replication is "user-managed" and ignored otherwise.'
      ),
    labels: z
      .record(z.string().max(63), z.string().max(63))
      .refine((value) => Object.keys(value).length <= 64, {
        message: 'At most 64 labels are allowed',
      })
      .optional()
      .describe('Optional labels as a key/value map, for example {"env":"prod"}. At most 64.'),
    ttl: z
      .string()
      .max(32)
      .regex(/^[0-9]{1,17}(\.[0-9]{1,9})?s$/, {
        message: 'Must be a duration in seconds with a trailing s, for example 86400s',
      })
      .optional()
      .describe(
        'Optional time-to-live after which the secret is deleted automatically, as seconds with a trailing "s", for example "86400s". Useful for a short-lived break-glass credential.'
      ),
  })
);

/**
 * Every field except the target is optional, so a `.refine()` requires at least one. Without it
 * the derived updateMask would be empty and the API would reject the call with a less obvious
 * error than this message.
 */
export const UpdateSecretInputSchema = lazySchema(() =>
  z
    .object({
      projectId: projectId(),
      secretId: secretId(),
      labels: z
        .record(z.string().max(63), z.string().max(63))
        .refine((value) => Object.keys(value).length <= 64, {
          message: 'At most 64 labels are allowed',
        })
        .optional()
        .describe(
          'Replacement labels as a key/value map. This REPLACES the whole label map rather than merging, so read the current labels with getSecret first.'
        ),
      ttl: z
        .string()
        .max(32)
        .regex(/^[0-9]{1,17}(\.[0-9]{1,9})?s$/, {
          message: 'Must be a duration in seconds with a trailing s, for example 86400s',
        })
        .optional()
        .describe(
          'New time-to-live as seconds with a trailing "s", for example "86400s". Mutually exclusive with expireTime.'
        ),
      expireTime: z
        .string()
        .max(64)
        .describe('Absolute expiry as an RFC 3339 timestamp, for example "2026-12-31T23:59:59Z".')
        .optional(),
      versionAliases: z
        .record(z.string().max(255), z.string().max(19))
        .refine((value) => Object.keys(value).length <= 50, {
          message: 'At most 50 version aliases are allowed',
        })
        .optional()
        .describe(
          'Replacement alias map from alias name to version number, for example {"prod":"3"}. This REPLACES the whole map.'
        ),
      nextRotationTime: z
        .string()
        .max(64)
        .optional()
        .describe(
          'When the next rotation notification should fire, as an RFC 3339 timestamp. Requires a Pub/Sub topic on the secret.'
        ),
      rotationPeriod: z
        .string()
        .max(32)
        .regex(/^[0-9]{1,17}(\.[0-9]{1,9})?s$/, {
          message: 'Must be a duration in seconds with a trailing s, for example 2592000s',
        })
        .optional()
        .describe(
          'How often to fire a rotation notification, as seconds with a trailing "s", for example "2592000s" for 30 days. Must be at least 3600s.'
        ),
    })
    .refine(
      (value) =>
        value.labels !== undefined ||
        value.ttl !== undefined ||
        value.expireTime !== undefined ||
        value.versionAliases !== undefined ||
        value.nextRotationTime !== undefined ||
        value.rotationPeriod !== undefined,
      {
        message:
          'Set at least one of labels, ttl, expireTime, versionAliases, nextRotationTime or rotationPeriod, otherwise the update is a no-op.',
      }
    )
);

export const DeleteSecretInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId(),
    etag: etag(),
  })
);

// --- IAM policy ------------------------------------------------------------------------

export const GetSecretIamPolicyInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId(),
  })
);

export const PolicyBindingSchema = lazySchema(() =>
  z.object({
    role: z
      .string()
      .max(256)
      .regex(ROLE_NAME_PATTERN, {
        message: 'Must be a role name such as roles/secretmanager.secretAccessor',
      })
      .describe('The role bound to the members, for example "roles/secretmanager.secretAccessor".'),
    members: z
      .array(z.string().max(512).regex(MEMBER_PATTERN, { message: 'Must be a valid IAM member' }))
      .max(1500)
      .describe(
        'The principals holding the role, each with its type prefix, for example "serviceAccount:x@y.iam.gserviceaccount.com".'
      ),
    condition: z
      .object({
        expression: z.string().max(4096).describe('CEL expression gating the binding.'),
        title: z.string().max(256).optional().describe('Short label for the condition.'),
        description: z.string().max(1024).optional().describe('Longer condition description.'),
      })
      .optional()
      .describe('Optional IAM condition. Preserve it verbatim when rewriting a policy.'),
  })
);

export const SetSecretIamPolicyInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    secretId: secretId(),
    bindings: z
      .array(PolicyBindingSchema)
      .max(1500)
      .describe(
        'The COMPLETE set of bindings to write. This replaces the secret policy wholesale, so read it with getSecretIamPolicy first and send back the full list plus your edit.'
      ),
    etag: z
      .string()
      .max(128)
      .regex(ETAG_PATTERN, { message: 'Must be an etag as returned by getSecretIamPolicy' })
      .describe(
        'The etag returned by getSecretIamPolicy. Required: it makes the write fail instead of clobbering a concurrent change.'
      ),
    version: z
      .number()
      .int()
      .min(1)
      .max(3)
      .optional()
      .describe('Policy version. Use 3 whenever any binding carries a condition. Defaults to 3.'),
  })
);

export type ListSecretsInput = z.infer<typeof ListSecretsInputSchema>;
export type GetSecretInput = z.infer<typeof GetSecretInputSchema>;
export type ListSecretVersionsInput = z.infer<typeof ListSecretVersionsInputSchema>;
export type GetSecretVersionInput = z.infer<typeof GetSecretVersionInputSchema>;
export type AccessSecretVersionInput = z.infer<typeof AccessSecretVersionInputSchema>;
export type AddSecretVersionInput = z.infer<typeof AddSecretVersionInputSchema>;
export type SecretVersionActionInput = z.infer<typeof SecretVersionActionInputSchema>;
export type CreateSecretInput = z.infer<typeof CreateSecretInputSchema>;
export type UpdateSecretInput = z.infer<typeof UpdateSecretInputSchema>;
export type DeleteSecretInput = z.infer<typeof DeleteSecretInputSchema>;
export type GetSecretIamPolicyInput = z.infer<typeof GetSecretIamPolicyInputSchema>;
export type SetSecretIamPolicyInput = z.infer<typeof SetSecretIamPolicyInputSchema>;

export interface SecretRotation {
  nextRotationTime?: string;
  rotationPeriod?: string;
}

export interface SecretReplication {
  automatic?: Record<string, unknown>;
  userManaged?: { replicas?: Array<{ location?: string }> };
}

export interface SecretResponse {
  name?: string;
  createTime?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  versionAliases?: Record<string, string>;
  replication?: SecretReplication;
  rotation?: SecretRotation;
  ttl?: string;
  expireTime?: string;
  etag?: string;
  topics?: Array<{ name?: string }>;
}

export interface SecretVersionResponse {
  name?: string;
  createTime?: string;
  destroyTime?: string;
  scheduledDestroyTime?: string;
  state?: string;
  etag?: string;
  clientSpecifiedPayloadChecksum?: boolean;
  replicationStatus?: Record<string, unknown>;
}

/**
 * The payload of an accessSecretVersion response. `data` is the live secret value, base64
 * encoded, and is deliberately never returned to a caller unless it opts in explicitly: it must
 * not reach an LLM context, a workflow log, or an execution record by default.
 */
export interface SecretPayloadResponse {
  data?: string;
  dataCrc32c?: string;
}

export interface AccessSecretVersionResponse {
  name?: string;
  payload?: SecretPayloadResponse;
}

export interface IamPolicyBinding {
  role?: string;
  members?: string[];
  condition?: { expression?: string; title?: string; description?: string };
}

export interface IamPolicyResponse {
  version?: number;
  etag?: string;
  bindings?: IamPolicyBinding[];
}
