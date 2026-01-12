/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import Url from 'url';
import type { ServerlessProjectType } from '@kbn/es';
import { createHash } from 'crypto';
import { KbnClient } from '../kbn_client';
import { isValidHostname, readCloudUsersFromFile } from './helper';
import type { Session } from './saml_auth';
import { createCloudSAMLSession, createLocalSAMLSession, getSecurityProfile } from './saml_auth';
import type { GetSessionByRole, Role, User } from './types';

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
  serverless?: SamlSessionManagerServerlessOptions;
  log: ToolingLog;
}

export interface SamlSessionManagerServerlessOptions {
  uiam: boolean;
  projectType: ServerlessProjectType;
  organizationId: string;
}

export interface SupportedRoles {
  sourcePath: string;
  roles: string[];
}

export interface GetCookieOptions {
  forceNewSession?: boolean;
  spaceId?: string;
}

/**
 * Manages cookies associated with user roles
 */
export class SamlSessionManager {
  private readonly isCloud: boolean;
  private readonly kbnHost: string;
  private readonly kbnClient: KbnClient;
  private readonly log: ToolingLog;
  private readonly roleToUserMap: Map<Role, User>;
  private readonly sessionCache: Map<Role, Session>;
  private readonly supportedRoles?: SupportedRoles;
  private readonly cloudHostName?: string;
  private readonly cloudUsersFilePath: string;
  private readonly serverless?: SamlSessionManagerServerlessOptions;

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
    this.sessionCache = new Map<Role, Session>();
    this.roleToUserMap = new Map<Role, User>();
    this.supportedRoles = options.supportedRoles;
    this.serverless = options.serverless;
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

  private getSessionByRole = async (options: GetSessionByRole): Promise<Session> => {
    const { role, forceNewSession, spaceId } = options;

    // Validate role before creating SAML session
    this.validateRole(role);

    const cacheKey = spaceId ? `${role}:${spaceId}` : role;

    // Check if session is cached and not forced to create the new one
    if (!forceNewSession && this.sessionCache.has(cacheKey)) {
      return this.sessionCache.get(cacheKey)!;
    }

    const session = await this.createSessionForRole(role);
    this.sessionCache.set(cacheKey, session);

    if (forceNewSession) {
      this.log.debug(`Session for role '${role}' was force updated.`);
    }

    return session;
  };

  private createSessionForRole = async (role: string): Promise<Session> => {
    if (this.isCloud) {
      this.log.debug(`Creating new cloud SAML session for role '${role}'`);
      const kbnVersion = await this.kbnClient.version.get();
      const { email, password } = this.getCloudUserByRole(role);
      return await createCloudSAMLSession({
        hostname: this.cloudHostName!,
        email,
        password,
        kbnHost: this.kbnHost,
        kbnVersion,
        log: this.log,
      });
    }

    // UIAM service requires numeric usernames, so we hash the role name (first 4 bytes) to generate a unique username.
    const username = this.serverless?.uiam
      ? createHash('sha256').update(`elastic_${role}`).digest().readUInt32BE(0).toString()
      : `elastic_${role}`;
    this.log.debug(`Creating new local SAML session for a user '${username}' with role '${role}'`);
    return await createLocalSAMLSession({
      username,
      email: `elastic_${role}@elastic.co`,
      fullname: `test ${role}`,
      role,
      kbnHost: this.kbnHost,
      serverless: this.serverless
        ? {
            organizationId: this.serverless.organizationId,
            projectType: this.serverless.projectType,
            uiamEnabled: this.serverless.uiam,
          }
        : undefined,
      log: this.log,
    });
  };

  validateRole = (role: string): void => {
    if (this.supportedRoles && !this.supportedRoles.roles.includes(role)) {
      const errorMessage = [
        `Role '${role}' not found in ${
          this.supportedRoles.sourcePath
        }. Available predefined roles: ${this.supportedRoles.roles.join(', ')}.`,
        `Is '${role}' a custom test role? → Use 'loginWithCustomRole()' for functional tests or 'getApiKeyForCustomRole()' for API tests to log in with custom Kibana and Elasticsearch privileges.`,
        `Is '${role}' a predefined role? (e.g., admin, viewer, editor) → Add the role descriptor to ${this.supportedRoles.sourcePath} to enable it for testing.`,
      ].join('\n\n');

      throw new Error(errorMessage);
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
