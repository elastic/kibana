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
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type {
  CreateServiceAccountInput,
  CreateServiceAccountKeyInput,
  GetIamPolicyInput,
  GetRoleInput,
  GetServiceAccountInput,
  IamPolicyBindingInput,
  IamPolicyResponse,
  ListServiceAccountKeysInput,
  ListServiceAccountsInput,
  PolicyBinding,
  QueryGrantableRolesInput,
  ServiceAccountActionInput,
  ServiceAccountKeyActionInput,
  ServiceAccountKeyResponse,
  ServiceAccountResponse,
  SetIamPolicyInput,
  TestIamPermissionsInput,
  UndeleteServiceAccountInput,
} from './types';
import {
  CreateServiceAccountInputSchema,
  CreateServiceAccountKeyInputSchema,
  GetIamPolicyInputSchema,
  GetRoleInputSchema,
  GetServiceAccountInputSchema,
  IamPolicyBindingInputSchema,
  ListServiceAccountKeysInputSchema,
  ListServiceAccountsInputSchema,
  QueryGrantableRolesInputSchema,
  ServiceAccountActionInputSchema,
  ServiceAccountKeyActionInputSchema,
  SetIamPolicyInputSchema,
  TestIamPermissionsInputSchema,
  UndeleteServiceAccountInputSchema,
} from './types';

const IAM_API = 'https://iam.googleapis.com/v1';
const CRM_API = 'https://cloudresourcemanager.googleapis.com';

/**
 * Resolve the policy endpoint for a target.
 *
 * Two different services are involved. A service account's own policy lives on the IAM API, while
 * a project, folder or organization policy lives on Cloud Resource Manager, which serves folders
 * from v2 and the other two from v1. Calling a folder through v1 returns 404, so the version is
 * derived from the resource type rather than hardcoded.
 */
const policyUrl = (resourceType: string, resourceId: string, verb: string): string => {
  if (resourceType === 'serviceAccounts') {
    return `${IAM_API}/projects/-/serviceAccounts/${encodeURIComponent(resourceId)}:${verb}`;
  }
  const version = resourceType === 'folders' ? 'v2' : 'v1';
  return `${CRM_API}/${version}/${resourceType}/${encodeURIComponent(resourceId)}:${verb}`;
};

/**
 * A service account is addressable as `projects/-/serviceAccounts/<email>`; the `-` wildcard
 * resolves the project server-side, so a caller that only has an email still works.
 */
const serviceAccountPath = (email: string, projectId?: string): string =>
  `${IAM_API}/projects/${
    projectId ? encodeURIComponent(projectId) : '-'
  }/serviceAccounts/${encodeURIComponent(email)}`;

/**
 * Google's APIs expect a repeated query parameter for a list value (`keyTypes=A&keyTypes=B`).
 * Axios defaults to the bracket form (`keyTypes[]=A`), which Google rejects outright with
 * `Unknown name "keyTypes[]": Cannot bind query parameter` (confirmed against the live API),
 * so any action passing an array param must use this serializer.
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
      `Google Cloud IAM API error (${axiosError.response?.status})${status}: ${data.error.message}`
    );
  }
  if (axiosError.response?.data !== undefined) {
    throw new Error(
      `Google Cloud IAM API error (${axiosError.response?.status}): ${JSON.stringify(
        axiosError.response.data
      )}`
    );
  }
  throw error;
};

/**
 * The API omits `disabled` entirely when an account or key is enabled, rather than returning
 * false. A workflow branching on the field would then see `undefined` and take the wrong path,
 * so it is normalized to a real boolean.
 */
const trimServiceAccount = (account: ServiceAccountResponse) => ({
  name: account.name,
  email: account.email,
  uniqueId: account.uniqueId,
  displayName: account.displayName,
  description: account.description,
  projectId: account.projectId,
  oauth2ClientId: account.oauth2ClientId,
  etag: account.etag,
  disabled: account.disabled === true,
});

/**
 * `privateKeyData` is deliberately dropped. It is live credential material, and every consumer
 * here (an agent tool result, a workflow step output, an execution record) is a place a secret
 * must not land.
 */
const trimServiceAccountKey = (key: ServiceAccountKeyResponse) => ({
  name: key.name,
  keyId: key.name?.split('/').pop(),
  keyAlgorithm: key.keyAlgorithm,
  keyOrigin: key.keyOrigin,
  keyType: key.keyType,
  validAfterTime: key.validAfterTime,
  validBeforeTime: key.validBeforeTime,
  disabled: key.disabled === true,
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
 * Read the live policy so a binding edit can be applied to it. Version 3 is requested
 * explicitly: at lower versions the API strips conditional bindings from the response, and
 * writing that truncated policy back would silently delete every conditional grant.
 */
const readPolicyForUpdate = async (
  ctx: ActionContext,
  resourceType: string,
  resourceId: string
): Promise<IamPolicyResponse> => {
  const response = await ctx.client.post(policyUrl(resourceType, resourceId, 'getIamPolicy'), {
    options: { requestedPolicyVersion: 3 },
  });
  return response.data as IamPolicyResponse;
};

/**
 * Write a policy back, always echoing the etag read moments earlier. Without it a concurrent
 * edit is overwritten instead of rejected.
 */
const writePolicy = async (
  ctx: ActionContext,
  resourceType: string,
  resourceId: string,
  bindings: PolicyBinding[],
  etag: string | undefined,
  version: number
) => {
  const response = await ctx.client.post(policyUrl(resourceType, resourceId, 'setIamPolicy'), {
    policy: { version, bindings, ...(etag ? { etag } : {}) },
  });
  return trimPolicy(response.data as IamPolicyResponse);
};

export const GcpIam: ConnectorSpec = {
  metadata: {
    id: '.gcp_iam',
    displayName: 'Google Cloud IAM',
    description: i18n.translate('core.kibanaConnectorSpecs.gcpIam.metadata.description', {
      defaultMessage:
        'Disable service accounts, revoke leaked keys, and grant or revoke IAM role bindings in Google Cloud IAM',
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
          label: i18n.translate('core.kibanaConnectorSpecs.gcpIam.config.defaultProjectId', {
            defaultMessage: 'Default project ID',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.gcpIam.config.defaultProjectIdHelp', {
            defaultMessage:
              'Optional. The project used when an action does not specify one, for example my-project-123. Actions that take an explicit project id always win.',
          }),
          placeholder: 'my-project-123',
        }),
    })
  ),

  skill: `Google Cloud IAM controls which principals hold which roles on Google Cloud resources. Use this connector to contain a compromised cloud identity and to roll that containment back.

Containment flow for a compromised service account:
1. getServiceAccount or listServiceAccounts to confirm the target and read its current disabled state.
2. disableServiceAccount to stop it authenticating. This is the fastest full-lockout move and it is reversible with enableServiceAccount.
3. listServiceAccountKeys, then disableServiceAccountKey (reversible) or deleteServiceAccountKey (permanent) to cut a specific leaked credential while leaving the account usable.
4. testIamPermissions afterwards to confirm the revocation actually took effect.

Access revocation flow:
1. getIamPolicy on the target to see who holds what.
2. removeIamPolicyBinding to revoke one role from one member, or addIamPolicyBinding to grant one.
3. getIamPolicy again to confirm.

Pick the narrowest scope that solves the problem. resourceType: serviceAccounts targets the policy ON a single service account, which controls who may impersonate it (roles/iam.serviceAccountTokenCreator, roles/iam.serviceAccountUser). If an attacker reached a workload by impersonating a service account, revoking that binding contains the attack without touching project-wide access anybody else depends on. resourceType: projects, folders and organizations edit the resource-hierarchy policy instead, which is what governs what members may do across everything under it.

Gotchas:
- addIamPolicyBinding and removeIamPolicyBinding are read-modify-write under the hood: they fetch the policy, edit one binding, and write it back with the etag. If the write races another change it fails rather than clobbering it; re-run the action to retry against the fresh policy.
- setIamPolicy REPLACES the entire policy for whatever it targets. Only reach for it for bulk remediation, and always build its bindings from a getIamPolicy response rather than from memory. Prefer the add/remove binding actions for single changes. On a project, folder or organization this rewrites access for every member, so treat it as a high-blast-radius action; on a service account it only rewrites that one identity's impersonators.
- A role name always carries its prefix: "roles/editor", not "editor".
- A member always carries its type prefix: "user:a@b.com", "serviceAccount:x@y.iam.gserviceaccount.com".
- Folders are served by a different API version than projects and organizations. The connector handles that; just pass the right resourceType.
- Most actions accept an optional projectId. Omit it and the account is resolved with a project wildcard, which is usually what you want.
- createServiceAccountKey mints real credential material. The connector deliberately does NOT return the private key, so a workflow cannot leak it; an operator must retrieve it from Google Cloud directly. Treat the action as "rotate started", not "here is the key".
- Deleted service accounts can only be restored with undeleteServiceAccount for 30 days, and only by uniqueId, not by email.`,

  actions: {
    listServiceAccounts: {
      isTool: true,
      scope: 'read',
      description:
        'List the service accounts in a Google Cloud project, with email, uniqueId, display name, and whether each is disabled. ' +
        'The orientation tool: use it to find the target of a containment action when you have a project but not an exact account email. ' +
        'Paginates: keep passing nextPageToken until it is absent.',
      input: ListServiceAccountsInputSchema,
      handler: async (ctx, input: ListServiceAccountsInput) => {
        try {
          const response = await ctx.client.get(
            `${IAM_API}/projects/${encodeURIComponent(input.projectId)}/serviceAccounts`,
            { params: { pageSize: input.pageSize, pageToken: input.pageToken } }
          );
          const data = response.data as {
            accounts?: ServiceAccountResponse[];
            nextPageToken?: string;
          };
          return {
            accounts: (data.accounts ?? []).map(trimServiceAccount),
            nextPageToken: data.nextPageToken,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getServiceAccount: {
      isTool: true,
      scope: 'read',
      description:
        'Get one service account by email: name, uniqueId, display name, description, project, OAuth client id, etag, and whether it is disabled. ' +
        'Use it to enrich an identity alert or to check whether a containment step already landed. ' +
        'Note that uniqueId is the only handle that can restore the account if it is later deleted, so capture it before deleting.',
      input: GetServiceAccountInputSchema,
      handler: async (ctx, input: GetServiceAccountInput) => {
        try {
          const response = await ctx.client.get(
            serviceAccountPath(input.serviceAccountEmail, input.projectId)
          );
          return trimServiceAccount(response.data as ServiceAccountResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    disableServiceAccount: {
      // Locks a workload identity out entirely; a wrong target can break production.
      isTool: false,
      scope: 'destroy',
      description:
        'Disable a service account so it can no longer authenticate. The primary containment move for a compromised cloud identity, and fully reversible with enableServiceAccount. ' +
        'Every workload using this identity stops working immediately, so confirm the target with getServiceAccount first. Returns an empty body on success.',
      input: ServiceAccountActionInputSchema,
      handler: async (ctx, input: ServiceAccountActionInput) => {
        try {
          await ctx.client.post(
            `${serviceAccountPath(input.serviceAccountEmail, input.projectId)}:disable`,
            {}
          );
          return { disabled: true, serviceAccountEmail: input.serviceAccountEmail };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    enableServiceAccount: {
      isTool: false,
      scope: 'destroy',
      description:
        'Re-enable a previously disabled service account so it can authenticate again. The rollback for disableServiceAccount, used once an investigation clears the identity.',
      input: ServiceAccountActionInputSchema,
      handler: async (ctx, input: ServiceAccountActionInput) => {
        try {
          await ctx.client.post(
            `${serviceAccountPath(input.serviceAccountEmail, input.projectId)}:enable`,
            {}
          );
          return { disabled: false, serviceAccountEmail: input.serviceAccountEmail };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    listServiceAccountKeys: {
      isTool: true,
      scope: 'read',
      description:
        'List the keys on a service account, with key id, algorithm, origin, type, validity window, and whether each is disabled. ' +
        'Use it during triage to find leaked or stale credentials before cutting one. ' +
        'USER_MANAGED keys are the ones a human downloaded, so they are the usual leak source; SYSTEM_MANAGED keys are rotated by Google. ' +
        'Never returns key material.',
      input: ListServiceAccountKeysInputSchema,
      handler: async (ctx, input: ListServiceAccountKeysInput) => {
        try {
          const response = await ctx.client.get(
            `${serviceAccountPath(input.serviceAccountEmail, input.projectId)}/keys`,
            { params: { keyTypes: input.keyTypes }, paramsSerializer: serializeRepeatedParams }
          );
          const data = response.data as { keys?: ServiceAccountKeyResponse[] };
          return { keys: (data.keys ?? []).map(trimServiceAccountKey) };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    disableServiceAccountKey: {
      isTool: false,
      scope: 'destroy',
      description:
        'Disable one service account key. Cuts off a leaked credential while the account itself keeps working, so it contains the leak without taking down every workload. ' +
        'Reversible with enableServiceAccountKey. Prefer this over deleteServiceAccountKey while an investigation is still open.',
      input: ServiceAccountKeyActionInputSchema,
      handler: async (ctx, input: ServiceAccountKeyActionInput) => {
        try {
          await ctx.client.post(
            `${serviceAccountPath(
              input.serviceAccountEmail,
              input.projectId
            )}/keys/${encodeURIComponent(input.keyId)}:disable`,
            {}
          );
          return { disabled: true, keyId: input.keyId };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    enableServiceAccountKey: {
      isTool: false,
      scope: 'destroy',
      description:
        'Re-enable a previously disabled service account key. The rollback for disableServiceAccountKey, for when a key turns out to have been disabled in error.',
      input: ServiceAccountKeyActionInputSchema,
      handler: async (ctx, input: ServiceAccountKeyActionInput) => {
        try {
          await ctx.client.post(
            `${serviceAccountPath(
              input.serviceAccountEmail,
              input.projectId
            )}/keys/${encodeURIComponent(input.keyId)}:enable`,
            {}
          );
          return { disabled: false, keyId: input.keyId };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    deleteServiceAccountKey: {
      // Irreversible: a deleted key cannot be restored.
      isTool: false,
      scope: 'destroy',
      description:
        'Permanently delete a service account key. The terminal containment for a leaked credential and NOT reversible, unlike disableServiceAccountKey. ' +
        'Anything still authenticating with this key breaks immediately. Prefer disabling first unless the key is known-compromised.',
      input: ServiceAccountKeyActionInputSchema,
      handler: async (ctx, input: ServiceAccountKeyActionInput) => {
        try {
          await ctx.client.delete(
            `${serviceAccountPath(
              input.serviceAccountEmail,
              input.projectId
            )}/keys/${encodeURIComponent(input.keyId)}`
          );
          return { deleted: true, keyId: input.keyId };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    createServiceAccountKey: {
      isTool: false,
      scope: 'write',
      description:
        'Create a new key on a service account: the create half of a rotate-then-revoke key rotation. ' +
        'For safety this returns only the new key metadata (id, algorithm, validity), NEVER the private key material, so the secret cannot leak into a workflow log or an agent transcript. ' +
        'An operator must retrieve the key from Google Cloud directly. Treat a success here as "rotation started", then revoke the old key once the new one is deployed.',
      input: CreateServiceAccountKeyInputSchema,
      handler: async (ctx, input: CreateServiceAccountKeyInput) => {
        try {
          const response = await ctx.client.post(
            `${serviceAccountPath(input.serviceAccountEmail, input.projectId)}/keys`,
            {}
          );
          // Deliberately trimmed: the response body contains privateKeyData.
          return trimServiceAccountKey(response.data as ServiceAccountKeyResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getIamPolicy: {
      isTool: true,
      scope: 'read',
      description:
        'Read an IAM allow policy: every role binding with its members, any IAM conditions, and the etag. ' +
        'Targets a project, folder, or organization to see who holds which roles there, or a single service account to see who may impersonate it. ' +
        'Use it before acting, and afterwards to confirm a change landed. ' +
        'Requests policy version 3 so conditional bindings are visible rather than silently omitted.',
      input: GetIamPolicyInputSchema,
      handler: async (ctx, input: GetIamPolicyInput) => {
        try {
          const policy = await readPolicyForUpdate(ctx, input.resourceType, input.resourceId);
          return trimPolicy(policy);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    addIamPolicyBinding: {
      isTool: false,
      scope: 'destroy',
      description:
        'Grant one role to one member, leaving every other binding untouched. ' +
        'Targets a project, folder, or organization, or a single service account to let a member impersonate it. ' +
        'Use it to restore access after a rollback or to open break-glass access. ' +
        'Implemented as read-modify-write with the policy etag, so a concurrent policy change makes this fail rather than overwrite. ' +
        'Adding a member to a role that already exists is a no-op rather than an error.',
      input: IamPolicyBindingInputSchema,
      handler: async (ctx, input: IamPolicyBindingInput) => {
        try {
          const policy = await readPolicyForUpdate(ctx, input.resourceType, input.resourceId);
          const bindings: PolicyBinding[] = (policy.bindings ?? []).map((binding) => ({
            ...binding,
            members: [...(binding.members ?? [])],
          }));

          // Only touch an unconditional binding: a conditional one with the same role grants
          // something narrower, so folding a member into it would over-grant.
          const existing = bindings.find(
            (binding) => binding.role === input.role && binding.condition === undefined
          );
          let alreadyPresent = false;
          if (existing) {
            if (existing.members?.includes(input.member)) {
              alreadyPresent = true;
            } else {
              existing.members = [...(existing.members ?? []), input.member];
            }
          } else {
            bindings.push({ role: input.role, members: [input.member] });
          }

          if (alreadyPresent) {
            return {
              changed: false,
              reason: 'Member already holds this role',
              role: input.role,
              member: input.member,
              policy: trimPolicy(policy),
            };
          }

          const updated = await writePolicy(
            ctx,
            input.resourceType,
            input.resourceId,
            bindings,
            policy.etag,
            policy.version ?? 3
          );
          return { changed: true, role: input.role, member: input.member, policy: updated };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    removeIamPolicyBinding: {
      isTool: false,
      scope: 'destroy',
      description:
        'Revoke one role from one member, leaving every other binding untouched. The core access-revocation response. ' +
        'Targets a project, folder, or organization, or a single service account to cut off an impersonator, which is the narrowest containment move available here. ' +
        'Implemented as read-modify-write with the policy etag, so a concurrent policy change makes this fail rather than overwrite. ' +
        'Removes the member from matching bindings including conditional ones, and drops a binding that ends up with no members. ' +
        'Reports changed: false when the member did not hold the role, so a workflow can tell a no-op from a revocation.',
      input: IamPolicyBindingInputSchema,
      handler: async (ctx, input: IamPolicyBindingInput) => {
        try {
          const policy = await readPolicyForUpdate(ctx, input.resourceType, input.resourceId);
          let removed = false;
          const bindings: PolicyBinding[] = [];

          for (const binding of policy.bindings ?? []) {
            if (binding.role !== input.role) {
              bindings.push(binding);
              continue;
            }
            const members = (binding.members ?? []).filter((member) => {
              if (member === input.member) {
                removed = true;
                return false;
              }
              return true;
            });
            // A binding with an empty members array is rejected by the API, so drop it.
            if (members.length > 0) {
              bindings.push({ ...binding, members });
            }
          }

          if (!removed) {
            return {
              changed: false,
              reason: 'Member does not hold this role',
              role: input.role,
              member: input.member,
              policy: trimPolicy(policy),
            };
          }

          const updated = await writePolicy(
            ctx,
            input.resourceType,
            input.resourceId,
            bindings,
            policy.etag,
            policy.version ?? 3
          );
          return { changed: true, role: input.role, member: input.member, policy: updated };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    setIamPolicy: {
      // Replaces the whole policy: the highest-blast-radius action in the connector.
      isTool: false,
      scope: 'destroy',
      description:
        'Replace an entire IAM allow policy in one call. For bulk remediation only. ' +
        'This REPLACES every binding, so any binding missing from the input is revoked. Always build the bindings from a getIamPolicy response and pass back its etag. ' +
        'Scope matters enormously here: targeting a project, folder, or organization rewrites access for everyone on it, while targeting a service account only rewrites who may impersonate that one identity. ' +
        'For a single grant or revocation use addIamPolicyBinding or removeIamPolicyBinding instead, which do the read-modify-write safely.',
      input: SetIamPolicyInputSchema,
      handler: async (ctx, input: SetIamPolicyInput) => {
        try {
          return await writePolicy(
            ctx,
            input.resourceType,
            input.resourceId,
            input.bindings,
            input.etag,
            input.version ?? 3
          );
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    testIamPermissions: {
      isTool: true,
      scope: 'read',
      description:
        'Check which of the given permissions the caller holds on a project, folder, organization, or service account. Only the held subset is returned, so an empty list means none. ' +
        'Use it to confirm a revocation took effect, to verify least privilege, or to check the connector itself can perform an action before attempting it.',
      input: TestIamPermissionsInputSchema,
      handler: async (ctx, input: TestIamPermissionsInput) => {
        try {
          const response = await ctx.client.post(
            policyUrl(input.resourceType, input.resourceId, 'testIamPermissions'),
            { permissions: input.permissions }
          );
          const data = response.data as { permissions?: string[] };
          const held = data.permissions ?? [];
          return {
            heldPermissions: held,
            missingPermissions: input.permissions.filter(
              (permission) => !held.includes(permission)
            ),
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    getRole: {
      isTool: true,
      scope: 'read',
      description:
        'Get a role definition, including every permission it includes and its launch stage. ' +
        'Use it before changing a binding to understand what the role actually grants, so a remediation does not over- or under-grant. ' +
        'Works for predefined roles such as "roles/editor" and for custom project or organization roles.',
      input: GetRoleInputSchema,
      handler: async (ctx, input: GetRoleInput) => {
        try {
          // The role name is already a qualified resource path, so its slashes are structural
          // and must NOT be percent-encoded: /v1/roles/roles%2Feditor is rejected with a 400,
          // while /v1/roles/roles/editor succeeds. The regex on the input bounds the charset
          // in place of encoding.
          const response = await ctx.client.get(`${IAM_API}/${input.role}`);
          const data = response.data as {
            name?: string;
            title?: string;
            description?: string;
            includedPermissions?: string[];
            stage?: string;
            etag?: string;
          };
          return {
            name: data.name,
            title: data.title,
            description: data.description,
            includedPermissions: data.includedPermissions ?? [],
            permissionCount: (data.includedPermissions ?? []).length,
            stage: data.stage,
            etag: data.etag,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    queryGrantableRoles: {
      isTool: true,
      scope: 'read',
      description:
        'List the roles that can be granted on a project, folder, or organization. ' +
        'Use it to build a valid binding: a role that is not grantable on the target resource will be rejected by addIamPolicyBinding. ' +
        'Paginates: keep passing nextPageToken until it is absent.',
      input: QueryGrantableRolesInputSchema,
      handler: async (ctx, input: QueryGrantableRolesInput) => {
        try {
          const response = await ctx.client.post(`${IAM_API}/roles:queryGrantableRoles`, {
            // The API wants a full resource name, not a bare id.
            fullResourceName: `//cloudresourcemanager.googleapis.com/${input.resourceType}/${input.resourceId}`,
            pageSize: input.pageSize,
            pageToken: input.pageToken,
          });
          const data = response.data as {
            roles?: Array<{ name?: string; title?: string; description?: string }>;
            nextPageToken?: string;
          };
          return {
            roles: (data.roles ?? []).map((role) => ({
              name: role.name,
              title: role.title,
              description: role.description,
            })),
            nextPageToken: data.nextPageToken,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    createServiceAccount: {
      isTool: false,
      scope: 'write',
      description:
        'Create a service account in a project, for automated onboarding or a scoped break-glass identity. ' +
        'The new account starts with no roles at all, so pair it with addIamPolicyBinding to grant the least privilege it needs. ' +
        'Capture the returned uniqueId: it is the only handle that can restore the account if it is later deleted.',
      input: CreateServiceAccountInputSchema,
      handler: async (ctx, input: CreateServiceAccountInput) => {
        try {
          const response = await ctx.client.post(
            `${IAM_API}/projects/${encodeURIComponent(input.projectId)}/serviceAccounts`,
            {
              accountId: input.accountId,
              serviceAccount: {
                ...(input.displayName ? { displayName: input.displayName } : {}),
                ...(input.description ? { description: input.description } : {}),
              },
            }
          );
          return trimServiceAccount(response.data as ServiceAccountResponse);
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    deleteServiceAccount: {
      // Restorable for 30 days, and only by uniqueId, so treat as effectively terminal.
      isTool: false,
      scope: 'destroy',
      description:
        'Delete a service account: terminal cleanup after decommissioning. ' +
        'Everything authenticating as this identity breaks immediately. It can be restored with undeleteServiceAccount for 30 days, but only by uniqueId, so read that with getServiceAccount BEFORE deleting. ' +
        'For containment prefer disableServiceAccount, which is cleanly reversible.',
      input: ServiceAccountActionInputSchema,
      handler: async (ctx, input: ServiceAccountActionInput) => {
        try {
          await ctx.client.delete(serviceAccountPath(input.serviceAccountEmail, input.projectId));
          return { deleted: true, serviceAccountEmail: input.serviceAccountEmail };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },

    undeleteServiceAccount: {
      isTool: false,
      scope: 'destroy',
      description:
        'Restore a recently deleted service account: the safety net for a delete made in error. ' +
        'Takes the numeric uniqueId, not the email, because the email is not resolvable once deleted. Only works within 30 days of deletion.',
      input: UndeleteServiceAccountInputSchema,
      handler: async (ctx, input: UndeleteServiceAccountInput) => {
        try {
          const response = await ctx.client.post(
            `${IAM_API}/projects/${encodeURIComponent(
              input.projectId
            )}/serviceAccounts/${encodeURIComponent(input.uniqueId)}:undelete`,
            {}
          );
          const data = response.data as { restoredAccount?: ServiceAccountResponse };
          return {
            restored: true,
            account: data.restoredAccount ? trimServiceAccount(data.restoredAccount) : undefined,
          };
        } catch (error) {
          throwWithApiError(error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.gcpIam.test.description', {
      defaultMessage:
        'Verifies the Google Cloud IAM connection by reading a predefined role definition',
    }),
    handler: async (ctx) => {
      try {
        // Reading a predefined role needs only a valid token, no project-scoped permission,
        // so this isolates "are the credentials good" from "is the project reachable".
        // The role name already carries its `roles/` prefix: `/v1/roles/iam.x` is correct and
        // `/v1/roles/roles/iam.x` 404s (both verified against the live API).
        await ctx.client.get(`${IAM_API}/roles/iam.serviceAccountViewer`);
        // Resolving is what signals success; ConnectorTestHandlerResult declares `ok?: never`,
        // so a failure must throw rather than return an ok flag.
        return { message: 'Successfully connected to the Google Cloud IAM API' };
      } catch (error) {
        return throwWithApiError(error);
      }
    },
  },
};
