/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import crypto from 'crypto';
import { Cookie } from 'tough-cookie';
import { Session } from './saml_auth';
import type { SupportedRoles } from './session_manager';
import { SamlSessionManager } from './session_manager';
import * as samlAuth from './saml_auth';
import * as helper from './helper';
import type { Role, User, UserProfile } from './types';
import { SERVERLESS_ROLES_ROOT_PATH } from '@kbn/es';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const log = new ToolingLog();

const supportedRoles: SupportedRoles = {
  roles: ['admin', 'editor', 'viewer'],
  sourcePath: 'test/roles.yml',
};
const roleViewer = 'viewer';
const roleEditor = 'editor';
const cloudUsersFilePath = resolve(REPO_ROOT, SERVERLESS_ROLES_ROOT_PATH, 'role_users.json');

const createLocalSAMLSessionMock = jest.spyOn(samlAuth, 'createLocalSAMLSession');
const getSecurityProfileMock = jest.spyOn(samlAuth, 'getSecurityProfile');
const readCloudUsersFromFileMock = jest.spyOn(helper, 'readCloudUsersFromFile');

const getTestToken = () => 'kbn_cookie_' + crypto.randomBytes(16).toString('hex');

jest.mock('../kbn_client/kbn_client', () => {
  return {
    KbnClient: jest.fn(),
  };
});
const get = jest.fn();

describe('SamlSessionManager', () => {
  let createCloudSAMLSessionMock: jest.SpyInstance;
  beforeEach(() => {
    createCloudSAMLSessionMock = jest.spyOn(samlAuth, 'createCloudSAMLSession');
  });

  describe('for local session', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest
        .requireMock('../kbn_client/kbn_client')
        .KbnClient.mockImplementation(() => ({ version: { get } }));
      get.mockImplementation(() => Promise.resolve('8.12.0'));

      createLocalSAMLSessionMock.mockResolvedValue(new Session(cookieInstance, testEmail));
    });

    const hostOptions = {
      protocol: 'http' as 'http' | 'https',
      hostname: 'localhost',
      port: 5620,
      username: 'elastic',
      password: 'changeme',
    };
    const isCloud = false;
    const samlSessionManagerOptions = {
      hostOptions,
      isCloud,
      log,
      cloudUsersFilePath,
    };
    const testEmail = 'testuser@elastic.com';
    const testFullname = 'Test User';
    const cookieInstance = Cookie.parse(
      'sid=kbn_cookie_value; Path=/; Expires=Wed, 01 Oct 2023 07:00:00 GMT'
    )!;

    test('should create an instance of SamlSessionManager', () => {
      const samlSessionManager = new SamlSessionManager(samlSessionManagerOptions);
      expect(samlSessionManager).toBeInstanceOf(SamlSessionManager);
    });

    test(`'getSessionCookieForRole' should return the actual cookie value`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSessionManagerOptions);
      const cookie = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(
        roleViewer
      );
      expect(cookie).toBe(cookieInstance.value);
    });

    test(`'getApiCredentialsForRole' should return {Cookie: <cookieString>}`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSessionManagerOptions);
      const credentials = await samlSessionManager.getApiCredentialsForRole(roleViewer);
      expect(credentials).toEqual({ Cookie: `${cookieInstance.cookieString()}` });
    });

    test(`'getSessionCookieForRole' should call 'createLocalSAMLSession' only once for the same role`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSessionManagerOptions);
      await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(roleViewer);
      await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(roleEditor);
      await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(roleViewer);
      expect(createLocalSAMLSessionMock.mock.calls).toHaveLength(2);
      expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(0);
    });

    test(`'getSessionCookieForRole' should call 'createLocalSAMLSession' again if 'forceNewSession = true'`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSessionManagerOptions);
      createLocalSAMLSessionMock.mockResolvedValueOnce(
        new Session(
          Cookie.parse(`sid=${getTestToken()}; Path=/; Expires=Wed, 01 Oct 2023 07:00:00 GMT`)!,
          testEmail
        )
      );
      const cookieStr1 = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(
        roleViewer
      );
      createLocalSAMLSessionMock.mockResolvedValueOnce(
        new Session(
          Cookie.parse(`sid=${getTestToken()}; Path=/; Expires=Wed, 01 Oct 2023 08:00:00 GMT`)!,
          testEmail
        )
      );
      const cookieStr2 = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(
        roleViewer,
        {
          forceNewSession: true,
        }
      );
      expect(createLocalSAMLSessionMock.mock.calls).toHaveLength(2);
      expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(0);
      expect(cookieStr1).not.toEqual(cookieStr2);
    });

    test(`'getSessionCookieForRole' should call 'createLocalSAMLSession' with UIAM properties when in UIAM mode`, async () => {
      const samlSessionManager = new SamlSessionManager({
        ...samlSessionManagerOptions,
        serverless: { organizationId: 'org123', projectType: 'oblt', uiam: true },
      });
      await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(roleViewer);
      await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(roleEditor);

      expect(createLocalSAMLSessionMock).toHaveBeenCalledTimes(2);
      expect(createLocalSAMLSessionMock).toHaveBeenCalledWith({
        username: '1806480617',
        email: 'elastic_viewer@elastic.co',
        fullname: 'test viewer',
        role: 'viewer',
        serverless: { organizationId: 'org123', projectType: 'oblt', uiamEnabled: true },
        kbnHost: 'http://localhost:5620',
        log: expect.any(ToolingLog),
      });
      expect(createLocalSAMLSessionMock).toHaveBeenCalledWith({
        username: '2180895557',
        email: 'elastic_editor@elastic.co',
        fullname: 'test editor',
        role: 'editor',
        serverless: { organizationId: 'org123', projectType: 'oblt', uiamEnabled: true },
        kbnHost: 'http://localhost:5620',
        log: expect.any(ToolingLog),
      });
      expect(createCloudSAMLSessionMock).not.toHaveBeenCalled();
    });

    test(`'getEmail' return the correct email`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSessionManagerOptions);
      const email = await samlSessionManager.getEmail(roleEditor);
      expect(email).toBe(testEmail);
    });

    test(`'getUserData' should call security API and return user profile data`, async () => {
      const testData: UserProfile = {
        username: '6ta90xc',
        roles: [roleEditor],
        full_name: testFullname,
        email: testEmail,
        enabled: true,
        elastic_cloud_user: false,
      };
      getSecurityProfileMock.mockResolvedValueOnce(testData);
      const samlSessionManager = new SamlSessionManager(samlSessionManagerOptions);
      const userData = await samlSessionManager.getUserData(roleViewer);

      expect(userData).toEqual(testData);
    });

    test(`throws error when role is not in 'supportedRoles'`, async () => {
      const nonExistingRole = 'tester';
      const expectedErrorMessage = [
        `Role '${nonExistingRole}' not found in ${
          supportedRoles.sourcePath
        }. Available predefined roles: ${supportedRoles.roles.join(', ')}.`,
        `Is '${nonExistingRole}' a custom test role? → Use 'loginWithCustomRole()' for functional tests or 'getApiKeyForCustomRole()' for API tests to log in with custom Kibana and Elasticsearch privileges.`,
        `Is '${nonExistingRole}' a predefined role? (e.g., admin, viewer, editor) → Add the role descriptor to ${supportedRoles.sourcePath} to enable it for testing.`,
      ].join('\n\n');
      const samlSessionManager = new SamlSessionManager({
        ...samlSessionManagerOptions,
        supportedRoles,
      });
      await expect(
        samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(nonExistingRole)
      ).rejects.toThrow(expectedErrorMessage);
      await expect(samlSessionManager.getApiCredentialsForRole(nonExistingRole)).rejects.toThrow(
        expectedErrorMessage
      );
      await expect(samlSessionManager.getUserData(nonExistingRole)).rejects.toThrow(
        expectedErrorMessage
      );
      expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(0);
    });

    test(`doesn't throw error when supportedRoles is not defined`, async () => {
      const nonExistingRole = 'tester';
      const testData: UserProfile = {
        username: '6ta90xc',
        roles: [nonExistingRole],
        full_name: testFullname,
        email: testEmail,
        enabled: true,
        elastic_cloud_user: false,
      };
      getSecurityProfileMock.mockResolvedValueOnce(testData);
      const samlSessionManager = new SamlSessionManager(samlSessionManagerOptions);
      await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(nonExistingRole);
      await samlSessionManager.getApiCredentialsForRole(nonExistingRole);
      await samlSessionManager.getUserData(nonExistingRole);
      expect(createLocalSAMLSessionMock.mock.calls).toHaveLength(1);
      expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(0);
      expect(getSecurityProfileMock.mock.calls).toHaveLength(1);
    });
  });

  describe('for cloud session', () => {
    const hostOptions = {
      protocol: 'https' as 'http' | 'https',
      hostname: 'my-test-deployment.test.elastic.cloud',
      username: 'elastic',
      password: 'changeme',
    };
    const isCloud = true;
    const samlSessionManagerOptions = {
      hostOptions,
      isCloud,
      log,
      cloudUsersFilePath,
    };

    const cloudCookieInstance = Cookie.parse(
      'sid=cloud_cookie_value; Path=/; Expires=Wed, 01 Oct 2023 07:00:00 GMT'
    )!;
    const cloudHostName = 'cloud.env.co';
    const cloudEmail = 'viewer@elastic.co';
    const cloudFullname = 'Test Viewer';
    const cloudUsers = new Array<[Role, User]>();
    cloudUsers.push(['viewer', { email: 'viewer@elastic.co', password: 'p1234' }]);
    cloudUsers.push(['editor', { email: 'editor@elastic.co', password: 'p1234' }]);
    const samlSMOptionsWithCloudHostName = {
      ...samlSessionManagerOptions,
      cloudHostName,
    };

    describe('handles errors', () => {
      beforeEach(() => {
        jest.resetAllMocks();
        jest
          .requireMock('../kbn_client/kbn_client')
          .KbnClient.mockImplementation(() => ({ version: { get } }));
        get.mockImplementationOnce(() => Promise.resolve('8.12.0'));

        readCloudUsersFromFileMock.mockReturnValue(cloudUsers);
        delete process.env.TEST_CLOUD_HOST_NAME; // Ensure variable is unset
      });

      test('should throw error if TEST_CLOUD_HOST_NAME is not set', async () => {
        expect(() => new SamlSessionManager(samlSessionManagerOptions)).toThrow(
          `'cloudHostName' is required for Cloud authentication. Provide it in the constructor or via the TEST_CLOUD_HOST_NAME environment variable.`
        );
      });

      test(`should throw error if 'cloudHostName' is not a valid host`, async () => {
        const invalidHostName = 'invalid_host';
        expect(
          () =>
            new SamlSessionManager({ ...samlSessionManagerOptions, cloudHostName: invalidHostName })
        ).toThrow(`TEST_CLOUD_HOST_NAME is not a valid hostname: ${invalidHostName}`);
      });
    });

    beforeEach(() => {
      jest.resetAllMocks();
      jest
        .requireMock('../kbn_client/kbn_client')
        .KbnClient.mockImplementation(() => ({ version: { get } }));
      get.mockImplementationOnce(() => Promise.resolve('8.12.0'));

      createCloudSAMLSessionMock.mockResolvedValue(new Session(cloudCookieInstance, cloudEmail));
      readCloudUsersFromFileMock.mockReturnValue(cloudUsers);
      delete process.env.TEST_CLOUD_HOST_NAME;
    });

    test(`should create an instance of SamlSessionManager with 'cloudHostName' passed`, () => {
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      expect(samlSessionManager).toBeInstanceOf(SamlSessionManager);
    });

    test(`should create an instance of SamlSessionManager with 'TEST_CLOUD_HOST_NAME' variable set`, () => {
      process.env.TEST_CLOUD_HOST_NAME = 'cloud.env.co'; // Mock the environment variable
      const samlSessionManager = new SamlSessionManager(samlSessionManagerOptions);
      expect(samlSessionManager).toBeInstanceOf(SamlSessionManager);
    });

    test(`'getSessionCookieForRole' should return the actual cookie value`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      createCloudSAMLSessionMock.mockResolvedValue(new Session(cloudCookieInstance, cloudEmail));
      const cookie = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(
        roleViewer
      );
      expect(cookie).toBe(cloudCookieInstance.value);
    });

    test(`'getApiCredentialsForRole' should return {Cookie: <cookieString>}`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      const credentials = await samlSessionManager.getApiCredentialsForRole(roleViewer);
      expect(credentials).toEqual({ Cookie: `${cloudCookieInstance.cookieString()}` });
    });

    test(`'getSessionCookieForRole' should call 'createCloudSAMLSession' only once for the same role`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(roleViewer);
      await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(roleEditor);
      await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(roleViewer);
      expect(createLocalSAMLSessionMock.mock.calls).toHaveLength(0);
      expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(2);
    });

    test(`'getSessionCookieForRole' should call 'createCloudSAMLSession' again if 'forceNewSession = true'`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      createCloudSAMLSessionMock.mockResolvedValueOnce(
        new Session(
          Cookie.parse(`sid=${getTestToken()}; Path=/; Expires=Wed, 01 Oct 2023 07:00:00 GMT`)!,
          cloudEmail
        )
      );
      const cookieStr1 = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(
        roleViewer
      );
      createCloudSAMLSessionMock.mockResolvedValueOnce(
        new Session(
          Cookie.parse(`sid=${getTestToken()}; Path=/; Expires=Wed, 01 Oct 2023 08:00:00 GMT`)!,
          cloudEmail
        )
      );
      const cookieStr2 = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(
        roleViewer,
        {
          forceNewSession: true,
        }
      );
      expect(createLocalSAMLSessionMock.mock.calls).toHaveLength(0);
      expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(2);
      expect(cookieStr1).not.toEqual(cookieStr2);
    });

    test(`'getEmail' return the correct email`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      const email = await samlSessionManager.getEmail(roleViewer);
      expect(email).toBe(cloudEmail);
    });

    test(`'getSupportedRoles' return empty array when roles by default`, async () => {
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      const roles = samlSessionManager.getSupportedRoles();
      expect(roles).toEqual([]);
    });

    test(`'getSupportedRoles' return the correct roles when roles were defined`, async () => {
      const samlSessionManager = new SamlSessionManager({
        ...samlSMOptionsWithCloudHostName,
        supportedRoles,
      });
      const roles = samlSessionManager.getSupportedRoles();
      expect(roles).toBe(supportedRoles.roles);
    });

    test(`'getUserData' should call security API and return user profile data`, async () => {
      const testData: UserProfile = {
        username: '92qab123',
        roles: [roleViewer],
        full_name: cloudFullname,
        email: cloudEmail,
        enabled: true,
        elastic_cloud_user: true,
      };
      getSecurityProfileMock.mockResolvedValueOnce(testData);
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      const userData = await samlSessionManager.getUserData(roleViewer);

      expect(userData).toEqual(testData);
    });

    test(`throws error for non-existing role when 'supportedRoles' is defined`, async () => {
      const nonExistingRole = 'tester';
      const expectedErrorMessage = [
        `Role '${nonExistingRole}' not found in ${
          supportedRoles.sourcePath
        }. Available predefined roles: ${supportedRoles.roles.join(', ')}.`,
        `Is '${nonExistingRole}' a custom test role? → Use 'loginWithCustomRole()' for functional tests or 'getApiKeyForCustomRole()' for API tests to log in with custom Kibana and Elasticsearch privileges.`,
        `Is '${nonExistingRole}' a predefined role? (e.g., admin, viewer, editor) → Add the role descriptor to ${supportedRoles.sourcePath} to enable it for testing.`,
      ].join('\n\n');
      const samlSessionManager = new SamlSessionManager({
        ...samlSMOptionsWithCloudHostName,
        supportedRoles,
      });
      await expect(
        samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(nonExistingRole)
      ).rejects.toThrow(expectedErrorMessage);
      await expect(samlSessionManager.getApiCredentialsForRole(nonExistingRole)).rejects.toThrow(
        expectedErrorMessage
      );
      await expect(samlSessionManager.getUserData(nonExistingRole)).rejects.toThrow(
        expectedErrorMessage
      );
      expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(0);
    });

    test(`throws error for non-existing role when 'supportedRoles' is not defined`, async () => {
      const nonExistingRole = 'tester';
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      await expect(
        samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(nonExistingRole)
      ).rejects.toThrow(`User with '${nonExistingRole}' role is not defined`);
      await expect(samlSessionManager.getApiCredentialsForRole(nonExistingRole)).rejects.toThrow(
        `User with '${nonExistingRole}' role is not defined`
      );
      await expect(samlSessionManager.getUserData(nonExistingRole)).rejects.toThrow(
        `User with '${nonExistingRole}' role is not defined`
      );
      expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(0);
    });

    test(`throws error when credentials are not specified for the role`, async () => {
      const noCredentialsRole = 'admin';
      const samlSessionManager = new SamlSessionManager(samlSMOptionsWithCloudHostName);
      await expect(
        samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(noCredentialsRole)
      ).rejects.toThrow(`User with '${noCredentialsRole}' role is not defined`);
      await expect(samlSessionManager.getApiCredentialsForRole(noCredentialsRole)).rejects.toThrow(
        `User with '${noCredentialsRole}' role is not defined`
      );
      await expect(samlSessionManager.getUserData(noCredentialsRole)).rejects.toThrow(
        `User with '${noCredentialsRole}' role is not defined`
      );
      expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(0);
    });
  });

  describe(`for cloud session with 'isCloud' set to false`, () => {
    const hostOptions = {
      protocol: 'http' as 'http' | 'https',
      hostname: 'my-test-deployment.test.elastic.cloud',
      username: 'elastic',
      password: 'changeme',
    };
    const samlSessionManagerOptions = {
      hostOptions,
      isCloud: false,
      log,
      cloudUsersFilePath,
    };

    beforeEach(() => {
      jest.resetAllMocks();
    });

    test('should throw an error when kbnHost points to a Cloud instance', () => {
      const kbnHost = `${hostOptions.protocol}://${hostOptions.hostname}`;
      expect(() => new SamlSessionManager(samlSessionManagerOptions)).toThrow(
        `SamlSessionManager: 'isCloud' was set to false, but 'kbnHost' appears to be a Cloud instance: ${kbnHost}
Set env variable 'TEST_CLOUD=1' to run FTR against your Cloud deployment`
      );
    });
  });
});
