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
 * Google resource ids are bounded and charset-constrained by GCP itself. Mirroring those
 * constraints here keeps an LLM- or workflow-supplied value from reaching a URL path segment
 * or a policy binding as something unexpected.
 */
const PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const SERVICE_ACCOUNT_EMAIL_PATTERN =
  /^[a-zA-Z0-9-_.]+@[a-zA-Z0-9-.]+\.(iam\.)?gserviceaccount\.com$/;
const KEY_ID_PATTERN = /^[a-f0-9]{40}$/;
const NUMERIC_ID_PATTERN = /^[0-9]{1,32}$/;

/**
 * A fully-qualified role name: `roles/x`, `projects/p/roles/x`, or `organizations/o/roles/x`.
 * The slashes are structural, so the value is validated by this regex rather than
 * percent-encoded: the API rejects `roles%2Fviewer` (see the getRole handler in gcp_iam.ts).
 */
const ROLE_NAME_PATTERN =
  /^(roles\/[a-zA-Z0-9_.]+|(projects|organizations)\/[a-z0-9-]+\/roles\/[a-zA-Z0-9_.-]+)$/;

/**
 * An IAM policy member, e.g. `user:a@b.com`, `serviceAccount:x@y.iam.gserviceaccount.com`,
 * `group:g@b.com`, `domain:example.com`, `allUsers`, `allAuthenticatedUsers`, or a
 * `principal://` / `principalSet://` workforce identifier.
 */
const MEMBER_PATTERN =
  /^(allUsers|allAuthenticatedUsers|(user|serviceAccount|group|domain|deleted|principal|principalSet|principalHierarchy):[^\s]{1,512})$/;

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

const serviceAccountEmail = () =>
  z
    .string()
    .max(320)
    .regex(SERVICE_ACCOUNT_EMAIL_PATTERN, {
      message:
        'Must be a service account email, for example my-sa@my-project.iam.gserviceaccount.com',
    })
    .describe(
      'Full service account email, for example "my-sa@my-project.iam.gserviceaccount.com". Obtain it from listServiceAccounts.'
    );

const keyId = () =>
  z
    .string()
    .max(64)
    .regex(KEY_ID_PATTERN, { message: 'Must be a 40-character hexadecimal key id' })
    .describe(
      'The key id: the last path segment of a key resource name, a 40-character hex string. Obtain it from listServiceAccountKeys.'
    );

/**
 * Which resource an IAM policy call targets. Projects, folders and organizations are served by
 * Cloud Resource Manager (folders from v2, the rest from v1); a service account's own policy is
 * served by the IAM API instead.
 *
 * A service-account policy answers "who may impersonate this identity", which is a different
 * question from "what may this identity do". Revoking an impersonator is a containment step in
 * its own right, and it is far narrower than editing a whole project's policy.
 */
export const ResourceTypeSchema = z
  .enum(['projects', 'folders', 'organizations', 'serviceAccounts'])
  .describe(
    'What the policy is attached to. Use "projects", "folders" or "organizations" for a resource-hierarchy policy, or "serviceAccounts" for the policy on a single service account, which controls who can impersonate it.'
  );

const resourceId = () =>
  z
    .string()
    .max(320)
    .regex(
      /^([a-z0-9][a-z0-9-]{2,62}|[0-9]{1,32}|[a-zA-Z0-9-_.]+@[a-zA-Z0-9-.]+\.(iam\.)?gserviceaccount\.com)$/,
      {
        message:
          'Must be a project id, the numeric id of a folder or organization, or a service account email',
      }
    )
    .describe(
      'The target: a project id for "projects", the numeric id for "folders" and "organizations", or the service account email for "serviceAccounts".'
    );

// --- Service account reads -------------------------------------------------------------

export const ListServiceAccountsInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum number of service accounts to return per page. Defaults to 100.'),
    pageToken: z
      .string()
      .max(2048)
      .optional()
      .describe(
        'Page token from a previous response. Keep paging while nextPageToken is present to enumerate every account.'
      ),
  })
);

export const GetServiceAccountInputSchema = lazySchema(() =>
  z.object({
    serviceAccountEmail: serviceAccountEmail(),
    projectId: projectId()
      .optional()
      .describe(
        'Optional project id. Omit it to resolve the account with the "-" wildcard, which works without knowing the project.'
      ),
  })
);

// --- Service account containment -------------------------------------------------------

export const ServiceAccountActionInputSchema = lazySchema(() =>
  z.object({
    serviceAccountEmail: serviceAccountEmail(),
    projectId: projectId()
      .optional()
      .describe('Optional project id. Omit it to use the "-" wildcard.'),
  })
);

// --- Keys ------------------------------------------------------------------------------

export const ListServiceAccountKeysInputSchema = lazySchema(() =>
  z.object({
    serviceAccountEmail: serviceAccountEmail(),
    projectId: projectId()
      .optional()
      .describe('Optional project id. Omit it to use the "-" wildcard.'),
    keyTypes: z
      .array(z.enum(['USER_MANAGED', 'SYSTEM_MANAGED']))
      .max(2)
      .optional()
      .describe(
        'Filter by key type. USER_MANAGED keys are the ones that leak, since a human downloaded them; SYSTEM_MANAGED keys are rotated by Google. Omit for both.'
      ),
  })
);

export const ServiceAccountKeyActionInputSchema = lazySchema(() =>
  z.object({
    serviceAccountEmail: serviceAccountEmail(),
    keyId: keyId(),
    projectId: projectId()
      .optional()
      .describe('Optional project id. Omit it to use the "-" wildcard.'),
  })
);

export const CreateServiceAccountKeyInputSchema = lazySchema(() =>
  z.object({
    serviceAccountEmail: serviceAccountEmail(),
    projectId: projectId()
      .optional()
      .describe('Optional project id. Omit it to use the "-" wildcard.'),
  })
);

// --- IAM policy ------------------------------------------------------------------------

export const GetIamPolicyInputSchema = lazySchema(() =>
  z.object({
    resourceType: ResourceTypeSchema,
    resourceId: resourceId(),
  })
);

export const IamPolicyBindingInputSchema = lazySchema(() =>
  z.object({
    resourceType: ResourceTypeSchema,
    resourceId: resourceId(),
    member: z
      .string()
      .max(512)
      .regex(MEMBER_PATTERN, {
        message:
          'Must be a valid IAM member, for example user:a@b.com or serviceAccount:x@y.iam.gserviceaccount.com',
      })
      .describe(
        'The principal, prefixed by type: "user:a@b.com", "serviceAccount:x@y.iam.gserviceaccount.com", "group:g@b.com", or "domain:example.com".'
      ),
    role: z
      .string()
      .max(256)
      .regex(ROLE_NAME_PATTERN, {
        message: 'Must be a role name such as roles/viewer or projects/p/roles/myCustomRole',
      })
      .describe(
        'The role to grant or revoke, for example "roles/editor" or a custom "projects/my-project/roles/myRole".'
      ),
  })
);

/**
 * A policy binding as the Cloud Resource Manager API represents it. Conditions are preserved
 * verbatim on read-modify-write so a conditional grant is not silently flattened.
 */
export const PolicyBindingSchema = lazySchema(() =>
  z.object({
    role: z.string().max(256).describe('The role bound to the members.'),
    members: z.array(z.string().max(512)).max(1500).describe('The principals holding the role.'),
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

export const SetIamPolicyInputSchema = lazySchema(() =>
  z.object({
    resourceType: ResourceTypeSchema,
    resourceId: resourceId(),
    bindings: z
      .array(PolicyBindingSchema)
      .max(1500)
      .describe(
        'The COMPLETE set of bindings to write. This replaces the policy wholesale, so read it with getIamPolicy first and send back the full list plus your edit.'
      ),
    etag: z
      .string()
      .max(256)
      .describe(
        'The etag returned by getIamPolicy. Required: it makes the write fail instead of clobbering a concurrent change.'
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

export const TestIamPermissionsInputSchema = lazySchema(() =>
  z.object({
    resourceType: ResourceTypeSchema,
    resourceId: resourceId(),
    permissions: z
      .array(
        z
          .string()
          .max(256)
          .regex(/^[a-zA-Z0-9.]+$/, { message: 'Must be a permission such as iam.roles.get' })
      )
      .min(1)
      .max(100)
      .describe(
        'Permissions to check, for example ["resourcemanager.projects.setIamPolicy"]. Only the held subset is returned.'
      ),
  })
);

// --- Roles -----------------------------------------------------------------------------

export const GetRoleInputSchema = lazySchema(() =>
  z.object({
    role: z
      .string()
      .max(256)
      .regex(ROLE_NAME_PATTERN, {
        message: 'Must be a role name such as roles/viewer or projects/p/roles/myCustomRole',
      })
      .describe(
        'Fully-qualified role name, for example "roles/iam.serviceAccountAdmin". Include the "roles/" prefix.'
      ),
  })
);

export const QueryGrantableRolesInputSchema = lazySchema(() =>
  z.object({
    resourceType: ResourceTypeSchema,
    resourceId: resourceId(),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Maximum roles to return per page. Defaults to 100.'),
    pageToken: z.string().max(2048).optional().describe('Page token from a previous response.'),
  })
);

// --- Service account provisioning ------------------------------------------------------

export const CreateServiceAccountInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    accountId: z
      .string()
      .min(6)
      .max(30)
      .regex(/^[a-z]([a-z0-9-]{4,28}[a-z0-9])$/, {
        message:
          'Must be 6-30 characters, lowercase letters, digits and hyphens, starting a letter',
      })
      .describe(
        'The id for the new account, which becomes <accountId>@<projectId>.iam.gserviceaccount.com.'
      ),
    displayName: z
      .string()
      .max(100)
      .optional()
      .describe('Human-readable name shown in the console.'),
    description: z
      .string()
      .max(256)
      .optional()
      .describe('Why this account exists. Worth setting for break-glass accounts.'),
  })
);

export const UndeleteServiceAccountInputSchema = lazySchema(() =>
  z.object({
    projectId: projectId(),
    uniqueId: z
      .string()
      .max(32)
      .regex(NUMERIC_ID_PATTERN, { message: 'Must be the numeric uniqueId of the deleted account' })
      .describe(
        'The numeric uniqueId of the deleted account, not its email. Deleted accounts can only be restored within 30 days.'
      ),
  })
);

export type ListServiceAccountsInput = z.infer<typeof ListServiceAccountsInputSchema>;
export type GetServiceAccountInput = z.infer<typeof GetServiceAccountInputSchema>;
export type ServiceAccountActionInput = z.infer<typeof ServiceAccountActionInputSchema>;
export type ListServiceAccountKeysInput = z.infer<typeof ListServiceAccountKeysInputSchema>;
export type ServiceAccountKeyActionInput = z.infer<typeof ServiceAccountKeyActionInputSchema>;
export type CreateServiceAccountKeyInput = z.infer<typeof CreateServiceAccountKeyInputSchema>;
export type GetIamPolicyInput = z.infer<typeof GetIamPolicyInputSchema>;
export type IamPolicyBindingInput = z.infer<typeof IamPolicyBindingInputSchema>;
export type SetIamPolicyInput = z.infer<typeof SetIamPolicyInputSchema>;
export type TestIamPermissionsInput = z.infer<typeof TestIamPermissionsInputSchema>;
export type GetRoleInput = z.infer<typeof GetRoleInputSchema>;
export type QueryGrantableRolesInput = z.infer<typeof QueryGrantableRolesInputSchema>;
export type CreateServiceAccountInput = z.infer<typeof CreateServiceAccountInputSchema>;
export type UndeleteServiceAccountInput = z.infer<typeof UndeleteServiceAccountInputSchema>;

export interface PolicyBinding {
  role?: string;
  members?: string[];
  condition?: { expression?: string; title?: string; description?: string };
}

export interface IamPolicyResponse {
  version?: number;
  etag?: string;
  bindings?: PolicyBinding[];
}

export interface ServiceAccountResponse {
  name?: string;
  email?: string;
  uniqueId?: string;
  displayName?: string;
  description?: string;
  projectId?: string;
  oauth2ClientId?: string;
  etag?: string;
  disabled?: boolean;
}

export interface ServiceAccountKeyResponse {
  name?: string;
  keyAlgorithm?: string;
  keyOrigin?: string;
  keyType?: string;
  validAfterTime?: string;
  validBeforeTime?: string;
  disabled?: boolean;
  /**
   * Live private-key material. Present only on key creation and deliberately never returned
   * to a caller: it must not reach an LLM context, a workflow log, or an execution record.
   */
  privateKeyData?: string;
}
