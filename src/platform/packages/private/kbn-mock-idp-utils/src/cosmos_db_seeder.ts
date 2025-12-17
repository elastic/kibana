/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHmac } from 'crypto';
import { Agent, fetch } from 'undici';

/**
 * Cosmos DB emulator uses a fixed key
 * For production, this should be retrieved from configuration
 */
const COSMOS_KEY =
  'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';

/**
 * Default Cosmos DB configuration
 */
export const DEFAULT_COSMOS_CONFIG = {
  endpoint: 'https://127.0.0.1:8081',
  databaseName: 'uiam-db',
  usersCollection: 'users',
} as const;

/**
 * Create an HTTPS agent that accepts self-signed certificates
 * for local Cosmos DB emulator development
 */
const httpsAgent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

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
 * Cosmos DB configuration options
 */
export interface CosmosDbConfig {
  endpoint?: string;
  databaseName?: string;
  usersCollection?: string;
  cosmosKey?: string;
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
  metadata: {
    created: string;
    last_modified: string;
  };
}

/**
 * Generate authorization token for Cosmos DB REST API
 */
function generateAuthToken(
  verb: string,
  resourceType: string,
  resourceLink: string,
  date: string,
  cosmosKey: string
): string {
  // Build the string to sign
  const stringToSign = `${verb}\n${resourceType}\n${resourceLink}\n${date.toLowerCase()}\n\n`;

  // Decode the Cosmos key from base64
  const keyBuffer = Buffer.from(cosmosKey, 'base64');

  // Generate HMAC-SHA256 signature
  const signature = createHmac('sha256', keyBuffer).update(stringToSign).digest('base64');

  // URL encode the signature
  const encodedSig = encodeURIComponent(signature);

  return `type%3Dmaster%26ver%3D1.0%26sig%3D${encodedSig}`;
}

/**
 * Create a user document matching PersistableUser structure
 */
function createUserDocument(userData: TestUserData, currentTime: string): PersistableUser {
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
 * @param config - Cosmos DB configuration (optional)
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
  userData: TestUserData,
  config: CosmosDbConfig = {}
): Promise<{ success: boolean; message: string; response?: any }> {
  const {
    endpoint = DEFAULT_COSMOS_CONFIG.endpoint,
    databaseName = DEFAULT_COSMOS_CONFIG.databaseName,
    usersCollection = DEFAULT_COSMOS_CONFIG.usersCollection,
    cosmosKey = COSMOS_KEY,
  } = config;

  const currentTime = new Date().toISOString();
  const userDoc = createUserDocument(userData, currentTime);

  // Generate date in RFC 1123 format
  const date = new Date().toUTCString();
  const resourceLink = `dbs/${databaseName}/colls/${usersCollection}`;
  const authToken = generateAuthToken('POST', 'docs', resourceLink, date, cosmosKey);

  const url = `${endpoint}/dbs/${databaseName}/colls/${usersCollection}/docs`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authToken,
        'x-ms-date': date,
        'x-ms-version': '2018-12-31',
        'x-ms-documentdb-partitionkey': JSON.stringify([userData.userId]),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userDoc),
      dispatcher: httpsAgent,
    });

    const responseData = await response.json();

    if (response.status === 201) {
      return {
        success: true,
        message: `✓ Test user created successfully: ${userData.userId}`,
        response: responseData,
      };
    } else if (response.status === 409) {
      // User already exists, update it instead
      return await updateTestUser(userData, config);
    } else {
      return {
        success: false,
        message: `✗ Failed to create test user (HTTP ${response.status})`,
        response: responseData,
      };
    }
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
 * @param config - Cosmos DB configuration (optional)
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
  userData: TestUserData,
  config: CosmosDbConfig = {}
): Promise<{ success: boolean; message: string; response?: any }> {
  const {
    endpoint = DEFAULT_COSMOS_CONFIG.endpoint,
    databaseName = DEFAULT_COSMOS_CONFIG.databaseName,
    usersCollection = DEFAULT_COSMOS_CONFIG.usersCollection,
    cosmosKey = COSMOS_KEY,
  } = config;

  const currentTime = new Date().toISOString();
  const userDoc = createUserDocument(userData, currentTime);

  // Generate date in RFC 1123 format
  const date = new Date().toUTCString();
  const resourceLink = `dbs/${databaseName}/colls/${usersCollection}/docs/${userData.userId}`;
  const authToken = generateAuthToken('PUT', 'docs', resourceLink, date, cosmosKey);

  const url = `${endpoint}/dbs/${databaseName}/colls/${usersCollection}/docs/${userData.userId}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: authToken,
        'x-ms-date': date,
        'x-ms-version': '2018-12-31',
        'x-ms-documentdb-partitionkey': JSON.stringify([userData.userId]),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userDoc),
      dispatcher: httpsAgent,
    });

    const responseData = await response.json();

    if (response.status === 200) {
      return {
        success: true,
        message: `✓ Test user updated successfully: ${userData.userId}`,
        response: responseData,
      };
    } else {
      return {
        success: false,
        message: `✗ Failed to update test user (HTTP ${response.status})`,
        response: responseData,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `✗ Error updating test user: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
