/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Cookie } from 'tough-cookie';
import { Session } from './saml_auth';
import { SamlSessionManager } from './session_manager';
import * as samlAuth from './saml_auth';
import * as helper from './helper';
import { Role, User } from './types';

const log = new ToolingLog();

const cookieInstance = Cookie.parse('sid=kbn_cookie_value; Path=/; Expires=Wed, 01 Oct 2023 07:00:00 GMT')!;
const email = 'testuser@elastic.com';
const fullname = 'Test User';

const cloudCookieInstance = Cookie.parse('sid=cloud_cookie_value; Path=/; Expires=Wed, 01 Oct 2023 07:00:00 GMT')!;
const cloudEmail = 'viewer@elastic.co';
const cloudFullname = 'Test Viewer';

const cloudUsers = new Array<[Role, User]>();
cloudUsers.push(['viewer', {email: "viewer@elastic.co", password: "p1234"}])
cloudUsers.push(['admin', {email: "admin@elastic.co", password: "p1234"}])

const createLocalSAMLSessionMock = jest.spyOn(samlAuth, 'createLocalSAMLSession');
const createCloudSAMLSessionMock = jest.spyOn(samlAuth, 'createCloudSAMLSession');
const readCloudUsersFromFileMock = jest.spyOn(helper, 'readCloudUsersFromFile');

jest.mock('../kbn_client/kbn_client', () => {
    return {
      KbnClient : jest.fn(),
    };
})
const get = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  jest.requireMock('../kbn_client/kbn_client').KbnClient.mockImplementation(() => ({ version: { get } }));
  get.mockImplementationOnce(() => Promise.resolve('8.12.0'));

  createLocalSAMLSessionMock.mockResolvedValue(new Session(cookieInstance, email, fullname));
  createCloudSAMLSessionMock.mockResolvedValue(new Session(cloudCookieInstance, cloudEmail, cloudFullname));
  readCloudUsersFromFileMock.mockReturnValue(cloudUsers);

});

describe('SamlSessionManager', () => {
  describe('for local session', () => {
    const hostOptions = {
        protocol: 'http' as "http" | "https",
        hostname: 'localhost',
        port: 5620,
        username: 'elastic',
        password: 'changeme',
    }
    const isCloud = false;
    test('should create an instance of SamlSessionManager', () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        expect(samlSessionManager).toBeInstanceOf(SamlSessionManager);
    });

    test(`'getSessionCookieForRole' should return the actual cookie value`, async () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        const cookie = await samlSessionManager.getSessionCookieForRole('tester');
        expect(cookie).toBe(cookieInstance.value);
      });
    
      test(`'getApiCredentialsForRole' should return {Cookie: <cookieString>}`, async () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        const credentials = await samlSessionManager.getApiCredentialsForRole('tester')
        expect(credentials).toEqual({Cookie: `${cookieInstance.cookieString()}`});
      });
    
      test(`'getSessionCookieForRole' should call 'createLocalSAMLSession' only once for the same role`, async () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        await samlSessionManager.getSessionCookieForRole('tester');
        await samlSessionManager.getSessionCookieForRole('admin');
        await samlSessionManager.getSessionCookieForRole('tester');
        expect(createLocalSAMLSessionMock.mock.calls).toHaveLength(2);
        expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(0);
        
      });
    
      test(`'getUserData' should return the correct email & fullname`, async () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        const data = await samlSessionManager.getUserData('tester');
        expect(data).toEqual({email, fullname})
      });
  })

  describe('for cloud session', () => {
    const hostOptions = {
        protocol: 'https' as "http" | "https",
        hostname: 'cloud',
        username: 'elastic',
        password: 'changeme',
    }
    const isCloud = true;
    test('should create an instance of SamlSessionManager', () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        expect(samlSessionManager).toBeInstanceOf(SamlSessionManager);
    });

    test(`'getSessionCookieForRole' should return the actual cookie value`, async () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        createCloudSAMLSessionMock.mockResolvedValue(new Session(cloudCookieInstance, cloudEmail, cloudFullname));
        const cookie = await samlSessionManager.getSessionCookieForRole('viewer');
        expect(cookie).toBe(cloudCookieInstance.value);
      });
    
      test(`'getApiCredentialsForRole' should return {Cookie: <cookieString>}`, async () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        const credentials = await samlSessionManager.getApiCredentialsForRole('viewer')
        expect(credentials).toEqual({Cookie: `${cloudCookieInstance.cookieString()}`});
      });
    
      test(`'getSessionCookieForRole' should call 'createCloudSAMLSession' only once for the same role`, async () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        await samlSessionManager.getSessionCookieForRole('viewer');
        await samlSessionManager.getSessionCookieForRole('admin');
        await samlSessionManager.getSessionCookieForRole('viewer');
        expect(createLocalSAMLSessionMock.mock.calls).toHaveLength(0);
        expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(2);
      });
    
      test(`'getUserData' should return the correct email & fullname`, async () => {
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        const data = await samlSessionManager.getUserData('viewer');
        expect(data).toEqual({email: cloudEmail, fullname: cloudFullname})
      });

      test(`throws error when roles does not exist`, async () => {
        const nonExistingRole = 'tester';
        const samlSessionManager = new SamlSessionManager({hostOptions, log, isCloud});
        await expect(samlSessionManager.getSessionCookieForRole(nonExistingRole)).rejects.toThrow(`User with '${nonExistingRole}' role is not defined`);
        await expect(samlSessionManager.getApiCredentialsForRole(nonExistingRole)).rejects.toThrow(`User with '${nonExistingRole}' role is not defined`);
        await expect(samlSessionManager.getUserData(nonExistingRole)).rejects.toThrow(`User with '${nonExistingRole}' role is not defined`);
        expect(createCloudSAMLSessionMock.mock.calls).toHaveLength(0);
      });
  })
});

