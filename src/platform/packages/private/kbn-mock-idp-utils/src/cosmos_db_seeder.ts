/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent } from 'undici';

import {
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS,
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS,
  MOCK_IDP_UIAM_COSMOS_DB_NAME,
  MOCK_IDP_UIAM_COSMOS_DB_URL,
} from './constants';
import { generateCosmosDBApiRequestHeaders } from '..';

/**
 * Create an HTTPS agent that accepts self-signed certificates
 * for local Cosmos DB emulator development
 */
const httpsAgent = new Agent({ connect: { rejectUnauthorized: false } });

/**
 * User data structure for seeding
 */
export interface TestUserData {
  userId: string;
  email?: string;
  firstName: string;
  lastName?: string;
  organizationId: string;
  roleId: string;
  projectType: string;
  applicationRoles: string[];
}

/**
 * PersistableUser structure matching the Cosmos DB schema
 */
interface PersistableUser {
  id: string;
  email?: string;
  first_name: string;
  last_name?: string;
  organization_memberships: Array<{
    organization_id: string;
    member_since: string;
  }>;
  role_assignments: {
    user: any[];
    project: Array<{
      role_id: string;
      organization_id: string;
      project_scope: {
        scope: string;
        project_ids?: string[];
      };
      project_type: string;
      application_roles: string[];
    }>;
    deployment: any[];
    platform: any[];
    organization: any[];
    cloudConnected: any[];
  };
  enabled: boolean;
  mfa_enforced: boolean;
  metadata: {
    created: string;
    last_modified: string;
  };
}

/**
 * Api key data structure for seeding.
 */
export interface TestApiKeyData {
  creator: string;
  organizationId: string;
}

/**
 * PersistableApiKey structure matching the Cosmos DB schema
 */
interface PersistableApiKey {
  id: string;
  hash: string;
  creator: string;
  organization_id: string;
  expiration: string;
  role_assignments: {
    organization: Array<{ organization_id: string; application_roles: string[]; role_id: string }>;
    deployment: unknown[];
    project: unknown[];
    cloud_connected_resource: unknown[];
  };
  internal: boolean;
  revoked: boolean;
  description?: string;
  metadata: { created: string; last_modified: string };
}

/**
 * Create a user document matching PersistableUser structure
 */
function createUserDocument(userData: TestUserData): PersistableUser {
  const currentTime = new Date().toISOString();
  return {
    id: userData.userId,
    email: userData.email,
    first_name: userData.firstName,
    last_name: userData.lastName,
    organization_memberships: [
      {
        organization_id: userData.organizationId,
        member_since: currentTime,
      },
    ],
    role_assignments: {
      user: [],
      project: [
        {
          role_id: userData.roleId,
          organization_id: userData.organizationId,
          project_scope: {
            scope: 'all',
          },
          project_type: userData.projectType,
          application_roles: userData.applicationRoles,
        },
      ],
      deployment: [],
      platform: [],
      organization: [],
      cloudConnected: [],
    },
    enabled: true,
    mfa_enforced: true,
    metadata: {
      created: currentTime,
      last_modified: currentTime,
    },
  };
}

/**
 * Seed a test user in Cosmos DB
 *
 * @param userData - User data to seed
 * @returns Promise that resolves when user is created or already exists
 *
 * @example
 * ```typescript
 * await seedTestUser({
 *   userId: '12345',
 *   email: 'test@elastic.co',
 *   firstName: 'Test',
 *   lastName: 'User',
 *   organizationId: '1234567890',
 *   roleId: 'cloud-role-id',
 *   projectType: 'observability',
 *   applicationRoles: ['viewer', 'editor'],
 * });
 * ```
 */
export async function seedTestUser(
  userData: TestUserData
): Promise<{ success: boolean; message: string; response?: any }> {
  try {
    const response = await fetch(
      `${MOCK_IDP_UIAM_COSMOS_DB_URL}/dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS}/docs`,
      {
        method: 'POST',
        headers: {
          ...generateCosmosDBApiRequestHeaders(
            'POST',
            'docs',
            `dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS}`
          ),
          'x-ms-documentdb-partitionkey': JSON.stringify([userData.userId]),
        },
        body: JSON.stringify(createUserDocument(userData)),
        // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
        dispatcher: httpsAgent,
      }
    );

    const responseData = await response.json();
    if (response.status === 201) {
      return {
        success: true,
        message: `✓ Test user created successfully: ${userData.userId}`,
        response: responseData,
      };
    }

    if (response.status === 409) {
      // User already exists, update it instead.
      return await updateTestUser(userData);
    }

    return {
      success: false,
      message: `✗ Failed to create test user (HTTP ${response.status})`,
      response: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: `✗ Error creating test user: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Update an existing test user in Cosmos DB
 *
 * @param userData - User data to update
 * @returns Promise that resolves when user is updated
 *
 * @example
 * ```typescript
 * await updateTestUser({
 *   userId: '12345',
 *   email: 'updated@elastic.co',
 *   firstName: 'Updated',
 *   lastName: 'User',
 *   organizationId: '1234567890',
 *   roleId: 'cloud-role-id',
 *   projectType: 'security',
 *   applicationRoles: ['admin', 'editor'],
 * });
 * ```
 */
export async function updateTestUser(
  userData: TestUserData
): Promise<{ success: boolean; message: string; response?: any }> {
  try {
    const response = await fetch(
      `${MOCK_IDP_UIAM_COSMOS_DB_URL}/dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS}/docs/${userData.userId}`,
      {
        method: 'PUT',
        headers: {
          ...generateCosmosDBApiRequestHeaders(
            'PUT',
            'docs',
            `dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_USERS}/docs/${userData.userId}`
          ),
          'x-ms-documentdb-partitionkey': JSON.stringify([userData.userId]),
        },
        body: JSON.stringify(createUserDocument(userData)),
        // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
        dispatcher: httpsAgent,
      }
    );

    const responseData = await response.json();
    if (response.status === 200) {
      return {
        success: true,
        message: `✓ Test user updated successfully: ${userData.userId}`,
        response: responseData,
      };
    }

    return {
      success: false,
      message: `✗ Failed to update test user (HTTP ${response.status})`,
      response: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: `✗ Error updating test user: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

const API_KEY_ID = '72kse5wBzbyj5dh9Iz13';

/**
 * Create an api key document matching PersistableApiKey structure.
 */
function createApiKeyDocument(apiKeyData: TestApiKeyData): PersistableApiKey {
  const currentTime = new Date().toISOString();
  return {
    // Hash for API key value "n2-RiRLS2gNSwXSR0pc2tg" is generated with the following snippet:
    // python3 -c 'import os, hashlib, base64; pwd=b"n2-RiRLS2gNSwXSR0pc2tg"; salt=os.urandom(32); h=hashlib.sha256(salt + pwd).digest(); print(f"{{SSHA-256}}${base64.b64encode(salt).decode()}${base64.b64encode(h).decode()}")'
    // Corresponds to: essu_dev_TnpKcmMyVTFkMEo2WW5scU5XUm9PVWw2TVRNNmJqSXRVbWxTVEZNeVowNVRkMWhUVWpCd1l6SjBadz09AAAAAN10T0s=
    id: API_KEY_ID,
    hash: '{SSHA-256}$yY06GoiBnlS/V2kNqWOTlh7OplBxIayo9C5wa5J5FxM=$OdktViokHd1IPPxULCSW4WEuxsY1ploVNbDsISwrLyk=',
    creator: apiKeyData.creator,
    organization_id: apiKeyData.organizationId,
    // Set expiration to 1 year in the future for testing purposes.
    expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    role_assignments: {
      organization: [
        {
          role_id: 'organization-admin',
          organization_id: apiKeyData.organizationId,
          application_roles: ['admin'],
        },
      ],
      deployment: [],
      project: [],
      cloud_connected_resource: [],
    },
    internal: false,
    revoked: false,
    description: 'test UIAM API key',
    metadata: { created: currentTime, last_modified: currentTime },
  };
}

/**
 * Seed a test Api Key in Cosmos DB
 *
 * @param apiKeyData - Api key data to seed.
 * @returns Promise that resolves when api key is created or already exists
 *
 * @example
 * ```ts
 * await seedTestApiKey({
 *   creator: '12345',
 *   organizationId: '1234567890'
 * });
 * ```
 */
export async function seedTestApiKey(
  apiKeyData: TestApiKeyData
): Promise<{ success: boolean; message: string; response?: any }> {
  try {
    const response = await fetch(
      `${MOCK_IDP_UIAM_COSMOS_DB_URL}/dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS}/docs`,
      {
        method: 'POST',
        headers: {
          ...generateCosmosDBApiRequestHeaders(
            'POST',
            'docs',
            `dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS}`
          ),
          'x-ms-documentdb-partitionkey': JSON.stringify([API_KEY_ID]),
        },
        body: JSON.stringify(createApiKeyDocument(apiKeyData)),
        // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
        dispatcher: httpsAgent,
      }
    );

    const responseData = await response.json();
    if (response.status === 201) {
      return {
        success: true,
        message: `✓ Test API key created successfully: ${apiKeyData.creator}`,
        response: responseData,
      };
    }

    if (response.status === 409) {
      // API key already exists, update it instead.
      return await updateTestApiKey(apiKeyData);
    }

    return {
      success: false,
      message: `✗ Failed to create test API key (HTTP ${response.status})`,
      response: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: `✗ Error creating test API key: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Update an existing API key in Cosmos DB.
 *
 * @param apiKeyData - API key data to update
 * @returns Promise that resolves when API key is updated
 *
 * @example
 * ```ts
 * await updateTestApiKey({
 *   creator: '12345',
 *   organizationId: '1234567890'
 * });
 * ```
 */
export async function updateTestApiKey(
  apiKeyData: TestApiKeyData
): Promise<{ success: boolean; message: string; response?: any }> {
  try {
    const response = await fetch(
      `${MOCK_IDP_UIAM_COSMOS_DB_URL}/dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS}/docs/${API_KEY_ID}`,
      {
        method: 'PUT',
        headers: {
          ...generateCosmosDBApiRequestHeaders(
            'PUT',
            'docs',
            `dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_API_KEYS}/docs/${API_KEY_ID}`
          ),
          'x-ms-documentdb-partitionkey': JSON.stringify([API_KEY_ID]),
        },
        body: JSON.stringify(createApiKeyDocument(apiKeyData)),
        // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
        dispatcher: httpsAgent,
      }
    );

    const responseData = await response.json();
    if (response.status === 200) {
      return {
        success: true,
        message: `✓ Test API key updated successfully: ${apiKeyData.creator}`,
        response: responseData,
      };
    }

    return {
      success: false,
      message: `✗ Failed to update test API key (HTTP ${response.status})`,
      response: responseData,
    };
  } catch (error) {
    return {
      success: false,
      message: `✗ Error updating test API key: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
