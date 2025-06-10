/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import Url from 'url';
import { KbnClient } from '../kbn_client';
import { isValidHostname, readCloudUsersFromFile } from './helper';
import {
  createCloudSAMLSession,
  createLocalSAMLSession,
  getSecurityProfile,
  Session,
} from './saml_auth';
import { GetSessionByRole, Role, User } from './types';

export interface HostOptions {
  protocol: 'http' | 'https';
  hostname: string;
  port?: number;
  username: string;
  password: string;
}

export interface SamlSessionManagerOptions {
  hostOptions: HostOptions;
  isCloud: boolean;
  supportedRoles?: SupportedRoles;
  cloudHostName?: string;
  cloudUsersFilePath: string;
  log: ToolingLog;
}

export interface SupportedRoles {
  sourcePath: string;
  roles: string[];
}

export interface GetCookieOptions {
  forceNewSession?: boolean;
  spaceId?: string;
}

export interface SessionInfo {
  session: Session;
  createdAt: number;
}
/**
 * Manages cookies associated with user roles
 */
export class SamlSessionManager {
  private static readonly SESSION_LIFE_SPAN: number = 20 * 60 * 1000; // 20 minutes in milliseconds
  private readonly isCloud: boolean;
  private readonly kbnHost: string;
  private readonly kbnClient: KbnClient;
  private readonly log: ToolingLog;
  private readonly roleToUserMap: Map<Role, User>;
  private readonly sessionCache: Map<Role, SessionInfo>;
  private readonly supportedRoles?: SupportedRoles;
  private readonly cloudHostName?: string;
  private readonly cloudUsersFilePath: string;

  constructor(options: SamlSessionManagerOptions) {
    this.log = options.log;
    const hostOptionsWithoutAuth = {
      protocol: options.hostOptions.protocol,
      hostname: options.hostOptions.hostname,
      port: options.hostOptions.port,
    };
    this.kbnHost = Url.format(hostOptionsWithoutAuth);
    this.isCloud = options.isCloud;
    this.cloudHostName = options.cloudHostName || process.env.TEST_CLOUD_HOST_NAME;
    if (this.isCloud) {
      this.validateCloudHostName();
    }
    this.kbnClient = new KbnClient({
      log: this.log,
      url: Url.format({
        ...hostOptionsWithoutAuth,
        auth: `${options.hostOptions.username}:${options.hostOptions.password}`,
      }),
    });
    this.cloudUsersFilePath = options.cloudUsersFilePath;
    this.sessionCache = new Map<Role, SessionInfo>();
    this.roleToUserMap = new Map<Role, User>();
    this.supportedRoles = options.supportedRoles;
    this.validateCloudSetting();
  }

  private validateCloudHostName() {
    if (!this.cloudHostName) {
      throw new Error(
        `'cloudHostName' is required for Cloud authentication. Provide it in the constructor or via the TEST_CLOUD_HOST_NAME environment variable.`
      );
    }

    if (!isValidHostname(this.cloudHostName)) {
      throw new Error(`TEST_CLOUD_HOST_NAME is not a valid hostname: ${this.cloudHostName}`);
    }
  }

  /**
   * Validates if the 'kbnHost' points to Cloud, even if 'isCloud' was set to false
   */
  private validateCloudSetting() {
    const cloudSubDomains = ['elastic.cloud', 'foundit.no', 'cloud.es.io', 'elastic-cloud.com'];
    const isCloudHost = cloudSubDomains.some((domain) => this.kbnHost.endsWith(domain));

    if (!this.isCloud && isCloudHost) {
      throw new Error(
        `SamlSessionManager: 'isCloud' was set to false, but 'kbnHost' appears to be a Cloud instance: ${this.kbnHost}
Set env variable 'TEST_CLOUD=1' to run FTR against your Cloud deployment`
      );
    }
  }

  /**
   * Loads cloud users from '.ftr/role_users.json'
   * QAF prepares the file for CI pipelines, make sure to add it manually for local run
   */
  private getCloudUsers = () => {
    if (this.roleToUserMap.size === 0) {
      this.log.info(`Reading cloud user credentials from ${this.cloudUsersFilePath}`);
      const data = readCloudUsersFromFile(this.cloudUsersFilePath);
      for (const [roleName, user] of data) {
        this.roleToUserMap.set(roleName, user);
      }
    }

    return this.roleToUserMap;
  };

  private getCloudUserByRole = (role: string) => {
    if (this.getCloudUsers().has(role)) {
      return this.getCloudUsers().get(role)!;
    } else {
      throw new Error(`User with '${role}' role is not defined`);
    }
  };

  /**
   * Public method to set a session for a specific role.
   * This is primarily intended for testing purposes.
   */
  public setSessionForRole(role: string, sessionInfo: SessionInfo) {
    this.sessionCache.set(role, sessionInfo);
  }

  /**
   * Public method to get a session for a specific role.
   * Returns undefined if no session exists for the role.
   */
  public getSessionInfoForRole(role: string): SessionInfo {
    const sessionInfo = this.sessionCache.get(role);
    if (!sessionInfo) {
      throw new Error(`No session found for role: ${role}`);
    }
    return sessionInfo;
  }

  private getSessionByRole = async (options: GetSessionByRole): Promise<Session> => {
    const { role, forceNewSession, spaceId } = options;

    // Validate role before creating SAML session
    this.validateRole(role);

    const cacheKey = spaceId ? `${role}:${spaceId}` : role;

    // Check if a valid cached session exists and return it if not expired
    if (!forceNewSession && this.sessionCache.has(cacheKey)) {
      const cachedSession = this.sessionCache.get(cacheKey)!;
      const sessionLifetime = 0.8 * SamlSessionManager.SESSION_LIFE_SPAN; // 80% of session lifespan
      const isSessionValid = Date.now() - cachedSession.createdAt < sessionLifetime;

      if (isSessionValid) {
        return cachedSession.session; // Return valid cached session
      }
      this.log.debug(`Session for role '${role}' expired.`);
      this.sessionCache.delete(cacheKey); // Remove expired session
    }

    // Create a new session if no valid cached session exists
    const session = await this.createSessionForRole(role);
    this.sessionCache.set(cacheKey, { session, createdAt: Date.now() });

    if (forceNewSession) {
      this.log.debug(`Session for role '${role}' was force updated.`);
    }

    return session;
  };

  private createSessionForRole = async (role: string): Promise<Session> => {
    let session: Session;

    if (this.isCloud) {
      this.log.debug(`Creating new cloud SAML session for role '${role}'`);
      const kbnVersion = await this.kbnClient.version.get();
      const { email, password } = this.getCloudUserByRole(role);
      session = await createCloudSAMLSession({
        hostname: this.cloudHostName!,
        email,
        password,
        kbnHost: this.kbnHost,
        kbnVersion,
        log: this.log,
      });
    } else {
      this.log.debug(`Creating new local SAML session for role '${role}'`);
      session = await createLocalSAMLSession({
        username: `elastic_${role}`,
        email: `elastic_${role}@elastic.co`,
        fullname: `test ${role}`,
        role,
        kbnHost: this.kbnHost,
        log: this.log,
      });
    }

    return session;
  };

  private validateRole = (role: string): void => {
    if (this.supportedRoles && !this.supportedRoles.roles.includes(role)) {
      throw new Error(
        `Role '${role}' is not in the supported list: ${this.supportedRoles.roles.join(
          ', '
        )}. Add role descriptor in ${this.supportedRoles.sourcePath} to enable it for testing`
      );
    }
  };

  async getApiCredentialsForRole(role: string, options?: GetCookieOptions) {
    const { forceNewSession } = options || { forceNewSession: false };
    const session = await this.getSessionByRole({
      role,
      forceNewSession: forceNewSession ?? false,
    });
    return { Cookie: `sid=${session.getCookieValue()}` };
  }

  async getInteractiveUserSessionCookieWithRoleScope(role: string, options?: GetCookieOptions) {
    const forceNewSession = options?.forceNewSession ?? false;
    const session = await this.getSessionByRole({
      role,
      forceNewSession,
      spaceId: options?.spaceId,
    });
    return session.getCookieValue();
  }

  async getEmail(role: string) {
    const session = await this.getSessionByRole({ role, forceNewSession: false });
    return session.email;
  }

  async getUserData(role: string) {
    const { cookie } = await this.getSessionByRole({ role, forceNewSession: false });
    const profileData = await getSecurityProfile({ kbnHost: this.kbnHost, cookie, log: this.log });
    return profileData;
  }

  getSupportedRoles() {
    return this.supportedRoles ? this.supportedRoles.roles : [];
  }
}
