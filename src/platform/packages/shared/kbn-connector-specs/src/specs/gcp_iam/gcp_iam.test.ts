/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { GcpIam } from './gcp_iam';

const IAM = 'https://iam.googleapis.com/v1';
const CRM = 'https://cloudresourcemanager.googleapis.com';
const SA_EMAIL = 'compromised-sa@my-project-123.iam.gserviceaccount.com';
const KEY_ID = 'a'.repeat(40);

describe('GcpIam', () => {
  const mockClient = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };
  const mockContext = {
    client: mockClient,
    config: {},
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  const getAction = (name: string) => {
    const action = GcpIam.actions[name];
    if (!action) {
      throw new Error(`Action ${name} is not defined on the spec`);
    }
    return action;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('uses the official product name', () => {
      expect(GcpIam.metadata.displayName).toBe('Google Cloud IAM');
    });

    it('supports workflows and agentBuilder features', () => {
      expect(GcpIam.metadata.supportedFeatureIds).toEqual(['workflows', 'agentBuilder']);
    });

    it('is marked as technical preview', () => {
      expect(GcpIam.metadata.isTechnicalPreview).toBe(true);
    });

    it('authenticates with a GCP service account', () => {
      expect(GcpIam.auth?.types).toEqual(['gcp_service_account']);
    });

    it('has a skill describing multi-step containment', () => {
      expect(GcpIam.skill).toContain('disableServiceAccount');
      expect(GcpIam.skill).toContain('read-modify-write');
    });
  });

  describe('isTool split', () => {
    // Reads are safe for an agent to call autonomously; anything that mutates an identity or a
    // policy is workflow-only so an agent cannot lock out a workload on its own.
    const readOnlyTools = [
      'listServiceAccounts',
      'getServiceAccount',
      'listServiceAccountKeys',
      'getIamPolicy',
      'testIamPermissions',
      'getRole',
      'queryGrantableRoles',
    ];
    const mutatingActions = [
      'disableServiceAccount',
      'enableServiceAccount',
      'disableServiceAccountKey',
      'enableServiceAccountKey',
      'deleteServiceAccountKey',
      'createServiceAccountKey',
      'addIamPolicyBinding',
      'removeIamPolicyBinding',
      'setIamPolicy',
      'createServiceAccount',
      'deleteServiceAccount',
      'undeleteServiceAccount',
    ];

    it.each(readOnlyTools)('exposes %s as an agent tool', (name) => {
      expect(getAction(name).isTool).toBe(true);
    });

    it.each(mutatingActions)('does not expose %s as an agent tool', (name) => {
      expect(getAction(name).isTool).toBe(false);
    });

    it('gives every action a description', () => {
      for (const [name, action] of Object.entries(GcpIam.actions)) {
        expect(typeof action.description === 'string' && action.description.length > 0).toBe(true);
        expect(name).not.toHaveLength(0);
      }
    });
  });

  describe('listServiceAccounts', () => {
    it('requests the project collection and passes pagination through', async () => {
      mockClient.get.mockResolvedValue({
        data: { accounts: [{ email: SA_EMAIL, uniqueId: '123' }], nextPageToken: 'next' },
      });

      const result = await getAction('listServiceAccounts').handler(mockContext, {
        projectId: 'my-project-123',
        pageSize: 50,
        pageToken: 'prev',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${IAM}/projects/my-project-123/serviceAccounts`,
        { params: { pageSize: 50, pageToken: 'prev' } }
      );
      expect(result).toEqual({
        accounts: [
          {
            name: undefined,
            email: SA_EMAIL,
            uniqueId: '123',
            displayName: undefined,
            description: undefined,
            projectId: undefined,
            oauth2ClientId: undefined,
            etag: undefined,
            disabled: false,
          },
        ],
        nextPageToken: 'next',
      });
    });

    it('returns an empty list when the project has no accounts', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      const result = await getAction('listServiceAccounts').handler(mockContext, {
        projectId: 'my-project-123',
      });

      expect(result).toEqual({ accounts: [], nextPageToken: undefined });
    });
  });

  describe('getServiceAccount', () => {
    it('uses the project wildcard when no project is given', async () => {
      mockClient.get.mockResolvedValue({ data: { email: SA_EMAIL } });

      await getAction('getServiceAccount').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${IAM}/projects/-/serviceAccounts/${encodeURIComponent(SA_EMAIL)}`
      );
    });

    it('scopes to the project when one is given', async () => {
      mockClient.get.mockResolvedValue({ data: { email: SA_EMAIL } });

      await getAction('getServiceAccount').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
        projectId: 'my-project-123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${IAM}/projects/my-project-123/serviceAccounts/${encodeURIComponent(SA_EMAIL)}`
      );
    });

    it('normalizes an absent disabled field to false', async () => {
      // The live API omits `disabled` entirely for an enabled account rather than returning
      // false, so a workflow branching on it would otherwise see undefined.
      mockClient.get.mockResolvedValue({ data: { email: SA_EMAIL, uniqueId: '123' } });

      const result = (await getAction('getServiceAccount').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
      })) as { disabled: boolean };

      expect(result.disabled).toBe(false);
    });

    it('reports a disabled account as disabled', async () => {
      mockClient.get.mockResolvedValue({ data: { email: SA_EMAIL, disabled: true } });

      const result = (await getAction('getServiceAccount').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
      })) as { disabled: boolean };

      expect(result.disabled).toBe(true);
    });

    it('surfaces the Google error message and status', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              message: 'Permission iam.serviceAccounts.get denied',
              status: 'PERMISSION_DENIED',
            },
          },
        },
      });

      await expect(
        getAction('getServiceAccount').handler(mockContext, { serviceAccountEmail: SA_EMAIL })
      ).rejects.toThrow(
        'Google Cloud IAM API error (403) [PERMISSION_DENIED]: Permission iam.serviceAccounts.get denied'
      );
    });
  });

  describe('service account containment', () => {
    it('disables an account with an empty body', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      const result = await getAction('disableServiceAccount').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${IAM}/projects/-/serviceAccounts/${encodeURIComponent(SA_EMAIL)}:disable`,
        {}
      );
      expect(result).toEqual({ disabled: true, serviceAccountEmail: SA_EMAIL });
    });

    it('enables an account with an empty body', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      const result = await getAction('enableServiceAccount').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${IAM}/projects/-/serviceAccounts/${encodeURIComponent(SA_EMAIL)}:enable`,
        {}
      );
      expect(result).toEqual({ disabled: false, serviceAccountEmail: SA_EMAIL });
    });
  });

  describe('keys', () => {
    it('lists keys and derives the key id from the resource name', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          keys: [
            {
              name: `projects/p/serviceAccounts/${SA_EMAIL}/keys/${KEY_ID}`,
              keyType: 'USER_MANAGED',
              keyAlgorithm: 'KEY_ALG_RSA_2048',
              validAfterTime: '2026-07-25T20:09:16Z',
              validBeforeTime: '2026-08-10T20:09:16Z',
            },
          ],
        },
      });

      const result = (await getAction('listServiceAccountKeys').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
        keyTypes: ['USER_MANAGED'],
      })) as { keys: Array<{ keyId?: string; disabled: boolean }> };

      expect(mockClient.get).toHaveBeenCalledWith(
        `${IAM}/projects/-/serviceAccounts/${encodeURIComponent(SA_EMAIL)}/keys`,
        expect.objectContaining({ params: { keyTypes: ['USER_MANAGED'] } })
      );
      expect(result.keys[0].keyId).toBe(KEY_ID);
      expect(result.keys[0].disabled).toBe(false);
    });

    it('serializes keyTypes as repeated params, not the axios bracket form', () => {
      // Asserting the params object alone is not enough: axios's default serializer emits
      // `keyTypes[]=USER_MANAGED`, which Google rejects with
      // `Unknown name "keyTypes[]": Cannot bind query parameter`. This was a real bug found
      // by live testing after the mocked assertion passed, so the serialized output itself
      // is what gets asserted here.
      mockClient.get.mockResolvedValue({ data: { keys: [] } });

      return getAction('listServiceAccountKeys')
        .handler(mockContext, {
          serviceAccountEmail: SA_EMAIL,
          keyTypes: ['USER_MANAGED', 'SYSTEM_MANAGED'],
        })
        .then(() => {
          const [, options] = mockClient.get.mock.calls[0];
          const serialized = options.paramsSerializer(options.params);
          expect(serialized).toBe('keyTypes=USER_MANAGED&keyTypes=SYSTEM_MANAGED');
          expect(serialized).not.toContain('%5B%5D');
          expect(serialized).not.toContain('[]');
        });
    });

    it('omits an undefined keyTypes filter from the query string', () => {
      mockClient.get.mockResolvedValue({ data: { keys: [] } });

      return getAction('listServiceAccountKeys')
        .handler(mockContext, { serviceAccountEmail: SA_EMAIL })
        .then(() => {
          const [, options] = mockClient.get.mock.calls[0];
          expect(options.paramsSerializer(options.params)).toBe('');
        });
    });

    it('disables a single key', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await getAction('disableServiceAccountKey').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
        keyId: KEY_ID,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${IAM}/projects/-/serviceAccounts/${encodeURIComponent(SA_EMAIL)}/keys/${KEY_ID}:disable`,
        {}
      );
    });

    it('enables a single key', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await getAction('enableServiceAccountKey').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
        keyId: KEY_ID,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${IAM}/projects/-/serviceAccounts/${encodeURIComponent(SA_EMAIL)}/keys/${KEY_ID}:enable`,
        {}
      );
    });

    it('deletes a key with DELETE, not POST', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      await getAction('deleteServiceAccountKey').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
        keyId: KEY_ID,
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        `${IAM}/projects/-/serviceAccounts/${encodeURIComponent(SA_EMAIL)}/keys/${KEY_ID}`
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('NEVER returns private key material when creating a key', async () => {
      // The create response carries live credential material. It must not reach an agent
      // transcript, a workflow log, or an execution record.
      mockClient.post.mockResolvedValue({
        data: {
          name: `projects/p/serviceAccounts/${SA_EMAIL}/keys/${KEY_ID}`,
          keyAlgorithm: 'KEY_ALG_RSA_2048',
          privateKeyData: 'ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAg-SECRET-MATERIAL',
          privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE',
        },
      });

      const result = await getAction('createServiceAccountKey').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
      });

      expect(JSON.stringify(result)).not.toContain('SECRET-MATERIAL');
      expect(JSON.stringify(result)).not.toContain('privateKeyData');
      expect(Object.keys(result as object)).not.toContain('privateKeyData');
      expect(result).toEqual({
        name: `projects/p/serviceAccounts/${SA_EMAIL}/keys/${KEY_ID}`,
        keyId: KEY_ID,
        keyAlgorithm: 'KEY_ALG_RSA_2048',
        keyOrigin: undefined,
        keyType: undefined,
        validAfterTime: undefined,
        validBeforeTime: undefined,
        disabled: false,
      });
    });
  });

  describe('getIamPolicy', () => {
    it('requests policy version 3 so conditional bindings are not dropped', async () => {
      mockClient.post.mockResolvedValue({
        data: { version: 3, etag: 'BwZYS1z3gVE=', bindings: [] },
      });

      await getAction('getIamPolicy').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${CRM}/v1/projects/my-project-123:getIamPolicy`,
        { options: { requestedPolicyVersion: 3 } }
      );
    });

    it('uses the v2 API for a folder and v1 for an organization', async () => {
      mockClient.post.mockResolvedValue({ data: { bindings: [] } });

      await getAction('getIamPolicy').handler(mockContext, {
        resourceType: 'folders',
        resourceId: '123456789',
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        `${CRM}/v2/folders/123456789:getIamPolicy`,
        expect.anything()
      );

      await getAction('getIamPolicy').handler(mockContext, {
        resourceType: 'organizations',
        resourceId: '987654321',
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        `${CRM}/v1/organizations/987654321:getIamPolicy`,
        expect.anything()
      );
    });

    it('preserves conditions on returned bindings', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          version: 3,
          etag: 'tag',
          bindings: [
            {
              role: 'roles/viewer',
              members: ['user:a@b.com'],
              condition: { expression: 'true', title: 'always' },
            },
          ],
        },
      });

      const result = (await getAction('getIamPolicy').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
      })) as { bindings: Array<{ condition?: { title?: string } }> };

      expect(result.bindings[0].condition).toEqual({ expression: 'true', title: 'always' });
    });
  });

  describe('addIamPolicyBinding', () => {
    it('echoes the etag back so a concurrent change cannot be clobbered', async () => {
      mockClient.post
        .mockResolvedValueOnce({
          data: {
            version: 3,
            etag: 'BwZYS1z3gVE=',
            bindings: [{ role: 'roles/viewer', members: ['user:existing@b.com'] }],
          },
        })
        .mockResolvedValueOnce({ data: { version: 3, etag: 'new', bindings: [] } });

      await getAction('addIamPolicyBinding').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        member: 'user:new@b.com',
        role: 'roles/viewer',
      });

      expect(mockClient.post).toHaveBeenNthCalledWith(
        2,
        `${CRM}/v1/projects/my-project-123:setIamPolicy`,
        {
          policy: {
            version: 3,
            etag: 'BwZYS1z3gVE=',
            bindings: [
              { role: 'roles/viewer', members: ['user:existing@b.com', 'user:new@b.com'] },
            ],
          },
        }
      );
    });

    it('creates the binding when the role is not yet present', async () => {
      mockClient.post
        .mockResolvedValueOnce({ data: { version: 3, etag: 'tag', bindings: [] } })
        .mockResolvedValueOnce({ data: { bindings: [] } });

      await getAction('addIamPolicyBinding').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        member: 'serviceAccount:x@y.iam.gserviceaccount.com',
        role: 'roles/editor',
      });

      const [, body] = mockClient.post.mock.calls[1];
      expect(body.policy.bindings).toEqual([
        { role: 'roles/editor', members: ['serviceAccount:x@y.iam.gserviceaccount.com'] },
      ]);
    });

    it('does not write when the member already holds the role', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: {
          version: 3,
          etag: 'tag',
          bindings: [{ role: 'roles/viewer', members: ['user:a@b.com'] }],
        },
      });

      const result = (await getAction('addIamPolicyBinding').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        member: 'user:a@b.com',
        role: 'roles/viewer',
      })) as { changed: boolean };

      expect(result.changed).toBe(false);
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    it('does not fold a member into a conditional binding of the same role', async () => {
      // A conditional binding grants something narrower, so adding a member to it would
      // silently under-grant relative to what the caller asked for.
      mockClient.post
        .mockResolvedValueOnce({
          data: {
            version: 3,
            etag: 'tag',
            bindings: [
              {
                role: 'roles/viewer',
                members: ['user:a@b.com'],
                condition: { expression: 'request.time < x', title: 'temp' },
              },
            ],
          },
        })
        .mockResolvedValueOnce({ data: { bindings: [] } });

      await getAction('addIamPolicyBinding').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        member: 'user:new@b.com',
        role: 'roles/viewer',
      });

      const [, body] = mockClient.post.mock.calls[1];
      expect(body.policy.bindings).toHaveLength(2);
      expect(body.policy.bindings[0].condition).toBeDefined();
      expect(body.policy.bindings[1]).toEqual({
        role: 'roles/viewer',
        members: ['user:new@b.com'],
      });
    });
  });

  describe('removeIamPolicyBinding', () => {
    it('removes only the target member and keeps other bindings', async () => {
      mockClient.post
        .mockResolvedValueOnce({
          data: {
            version: 3,
            etag: 'tag',
            bindings: [
              { role: 'roles/viewer', members: ['user:a@b.com', 'user:b@b.com'] },
              { role: 'roles/editor', members: ['user:a@b.com'] },
            ],
          },
        })
        .mockResolvedValueOnce({ data: { bindings: [] } });

      const result = (await getAction('removeIamPolicyBinding').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        member: 'user:a@b.com',
        role: 'roles/viewer',
      })) as { changed: boolean };

      const [, body] = mockClient.post.mock.calls[1];
      expect(result.changed).toBe(true);
      expect(body.policy.bindings).toEqual([
        { role: 'roles/viewer', members: ['user:b@b.com'] },
        { role: 'roles/editor', members: ['user:a@b.com'] },
      ]);
    });

    it('drops a binding that would be left with no members', async () => {
      // The API rejects a binding with an empty members array.
      mockClient.post
        .mockResolvedValueOnce({
          data: {
            version: 3,
            etag: 'tag',
            bindings: [{ role: 'roles/viewer', members: ['user:a@b.com'] }],
          },
        })
        .mockResolvedValueOnce({ data: { bindings: [] } });

      await getAction('removeIamPolicyBinding').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        member: 'user:a@b.com',
        role: 'roles/viewer',
      });

      const [, body] = mockClient.post.mock.calls[1];
      expect(body.policy.bindings).toEqual([]);
    });

    it('reports a no-op instead of writing when the member does not hold the role', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: {
          version: 3,
          etag: 'tag',
          bindings: [{ role: 'roles/viewer', members: ['user:someone-else@b.com'] }],
        },
      });

      const result = (await getAction('removeIamPolicyBinding').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        member: 'user:a@b.com',
        role: 'roles/viewer',
      })) as { changed: boolean; reason: string };

      expect(result.changed).toBe(false);
      expect(result.reason).toBe('Member does not hold this role');
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('setIamPolicy', () => {
    it('sends the supplied bindings with the etag and defaults to version 3', async () => {
      mockClient.post.mockResolvedValue({ data: { version: 3, etag: 'new', bindings: [] } });

      await getAction('setIamPolicy').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        bindings: [{ role: 'roles/viewer', members: ['user:a@b.com'] }],
        etag: 'BwZYS1z3gVE=',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${CRM}/v1/projects/my-project-123:setIamPolicy`,
        {
          policy: {
            version: 3,
            etag: 'BwZYS1z3gVE=',
            bindings: [{ role: 'roles/viewer', members: ['user:a@b.com'] }],
          },
        }
      );
    });
  });

  describe('testIamPermissions', () => {
    it('splits held from missing permissions', async () => {
      mockClient.post.mockResolvedValue({
        data: { permissions: ['iam.serviceAccounts.list'] },
      });

      const result = await getAction('testIamPermissions').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        permissions: ['iam.serviceAccounts.list', 'resourcemanager.projects.setIamPolicy'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${CRM}/v1/projects/my-project-123:testIamPermissions`,
        { permissions: ['iam.serviceAccounts.list', 'resourcemanager.projects.setIamPolicy'] }
      );
      expect(result).toEqual({
        heldPermissions: ['iam.serviceAccounts.list'],
        missingPermissions: ['resourcemanager.projects.setIamPolicy'],
      });
    });

    it('treats an absent permissions array as holding none', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      const result = (await getAction('testIamPermissions').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        permissions: ['iam.roles.get'],
      })) as { heldPermissions: string[]; missingPermissions: string[] };

      expect(result.heldPermissions).toEqual([]);
      expect(result.missingPermissions).toEqual(['iam.roles.get']);
    });
  });

  describe('getRole', () => {
    it('does NOT percent-encode the structural slash in the role name', async () => {
      // Verified against the live API: /v1/roles/iam.serviceAccountViewer returns 200 while
      // /v1/roles/roles%2Fiam.serviceAccountViewer is rejected with a 400, because the
      // `roles/` prefix is part of the resource name rather than a value to escape.
      mockClient.get.mockResolvedValue({
        data: { name: 'roles/iam.serviceAccountAdmin', includedPermissions: ['a', 'b'] },
      });

      await getAction('getRole').handler(mockContext, { role: 'roles/iam.serviceAccountAdmin' });

      expect(mockClient.get).toHaveBeenCalledWith(`${IAM}/roles/iam.serviceAccountAdmin`);
      const [url] = mockClient.get.mock.calls[0];
      expect(url).not.toContain('%2F');
    });

    it('supports a custom project role path', async () => {
      mockClient.get.mockResolvedValue({ data: { name: 'projects/p/roles/myRole' } });

      await getAction('getRole').handler(mockContext, { role: 'projects/p/roles/myRole' });

      expect(mockClient.get).toHaveBeenCalledWith(`${IAM}/projects/p/roles/myRole`);
    });

    it('reports the permission count so a caller can gauge blast radius', async () => {
      mockClient.get.mockResolvedValue({
        data: { name: 'roles/owner', includedPermissions: ['a', 'b', 'c'] },
      });

      const result = (await getAction('getRole').handler(mockContext, {
        role: 'roles/owner',
      })) as { permissionCount: number };

      expect(result.permissionCount).toBe(3);
    });
  });

  describe('queryGrantableRoles', () => {
    it('posts a full resource name rather than a bare id', async () => {
      mockClient.post.mockResolvedValue({ data: { roles: [{ name: 'roles/viewer' }] } });

      await getAction('queryGrantableRoles').handler(mockContext, {
        resourceType: 'projects',
        resourceId: 'my-project-123',
        pageSize: 10,
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${IAM}/roles:queryGrantableRoles`, {
        fullResourceName: '//cloudresourcemanager.googleapis.com/projects/my-project-123',
        pageSize: 10,
        pageToken: undefined,
      });
    });
  });

  describe('service account provisioning', () => {
    it('creates an account with the nested serviceAccount body', async () => {
      mockClient.post.mockResolvedValue({ data: { email: SA_EMAIL, uniqueId: '999' } });

      await getAction('createServiceAccount').handler(mockContext, {
        projectId: 'my-project-123',
        accountId: 'breakglass-sa',
        displayName: 'Break glass',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${IAM}/projects/my-project-123/serviceAccounts`,
        { accountId: 'breakglass-sa', serviceAccount: { displayName: 'Break glass' } }
      );
    });

    it('omits optional fields rather than sending empty strings', async () => {
      mockClient.post.mockResolvedValue({ data: { email: SA_EMAIL } });

      await getAction('createServiceAccount').handler(mockContext, {
        projectId: 'my-project-123',
        accountId: 'minimal-sa',
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body.serviceAccount).toEqual({});
    });

    it('deletes an account with DELETE', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      await getAction('deleteServiceAccount').handler(mockContext, {
        serviceAccountEmail: SA_EMAIL,
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        `${IAM}/projects/-/serviceAccounts/${encodeURIComponent(SA_EMAIL)}`
      );
    });

    it('undeletes by numeric uniqueId, not by email', async () => {
      mockClient.post.mockResolvedValue({
        data: { restoredAccount: { email: SA_EMAIL, uniqueId: '123456' } },
      });

      const result = (await getAction('undeleteServiceAccount').handler(mockContext, {
        projectId: 'my-project-123',
        uniqueId: '123456',
      })) as { restored: boolean };

      expect(mockClient.post).toHaveBeenCalledWith(
        `${IAM}/projects/my-project-123/serviceAccounts/123456:undelete`,
        {}
      );
      expect(result.restored).toBe(true);
    });
  });

  describe('test handler', () => {
    it('is enabled so the Test connector button works', () => {
      expect(GcpIam.test?.enabled).toBe(true);
    });

    it('reads a predefined role, which needs no project permission', async () => {
      mockClient.get.mockResolvedValue({ data: { name: 'roles/iam.serviceAccountViewer' } });

      const result = await GcpIam.test?.handler?.(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${IAM}/roles/iam.serviceAccountViewer`);
      // ConnectorTestHandlerResult declares `ok?: never`, so the handler signals success by
      // resolving rather than by returning an ok flag.
      expect(result).toEqual({
        message: 'Successfully connected to the Google Cloud IAM API',
      });
    });

    it('throws when the credentials are rejected', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 401, data: { error: { message: 'Invalid credentials' } } },
      });

      await expect(GcpIam.test?.handler?.(mockContext)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('input validation', () => {
    it('rejects a service account email that is not a GCP service account', () => {
      const schema = getAction('getServiceAccount').input;
      expect(schema?.safeParse({ serviceAccountEmail: 'attacker@evil.com' }).success).toBe(false);
      expect(schema?.safeParse({ serviceAccountEmail: SA_EMAIL }).success).toBe(true);
    });

    it('rejects a path-traversal attempt in the service account email', () => {
      const schema = getAction('getServiceAccount').input;
      expect(schema?.safeParse({ serviceAccountEmail: '../../../etc/passwd' }).success).toBe(false);
    });

    it('rejects a role name without its prefix', () => {
      const schema = getAction('getRole').input;
      expect(schema?.safeParse({ role: 'editor' }).success).toBe(false);
      expect(schema?.safeParse({ role: 'roles/editor' }).success).toBe(true);
    });

    it('rejects a member without a type prefix', () => {
      const schema = getAction('addIamPolicyBinding').input;
      const base = { resourceType: 'projects', resourceId: 'my-project-123', role: 'roles/viewer' };
      expect(schema?.safeParse({ ...base, member: 'a@b.com' }).success).toBe(false);
      expect(schema?.safeParse({ ...base, member: 'user:a@b.com' }).success).toBe(true);
      expect(schema?.safeParse({ ...base, member: 'allUsers' }).success).toBe(true);
    });

    it('rejects a key id that is not 40 hex characters', () => {
      const schema = getAction('deleteServiceAccountKey').input;
      const base = { serviceAccountEmail: SA_EMAIL };
      expect(schema?.safeParse({ ...base, keyId: 'not-a-key' }).success).toBe(false);
      expect(schema?.safeParse({ ...base, keyId: KEY_ID }).success).toBe(true);
    });

    it('bounds the permissions array on testIamPermissions', () => {
      const schema = getAction('testIamPermissions').input;
      const base = { resourceType: 'projects', resourceId: 'my-project-123' };
      expect(schema?.safeParse({ ...base, permissions: [] }).success).toBe(false);
      expect(
        schema?.safeParse({ ...base, permissions: new Array(101).fill('iam.roles.get') }).success
      ).toBe(false);
    });

    it('requires an etag on setIamPolicy', () => {
      const schema = getAction('setIamPolicy').input;
      expect(
        schema?.safeParse({
          resourceType: 'projects',
          resourceId: 'my-project-123',
          bindings: [],
        }).success
      ).toBe(false);
    });

    it('rejects an unknown resource type', () => {
      const schema = getAction('getIamPolicy').input;
      expect(schema?.safeParse({ resourceType: 'buckets', resourceId: 'x' }).success).toBe(false);
    });
  });
});
