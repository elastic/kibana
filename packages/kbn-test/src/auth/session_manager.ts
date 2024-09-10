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
import { readCloudUsersFromFile } from './helper';
import {
  createCloudSAMLSession,
  createLocalSAMLSession,
  getSecurityProfile,
  Session,
} from './saml_auth';
import { Role, User } from './types';

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
  cloudUsersFilePath: string;
  log: ToolingLog;
}

export interface SupportedRoles {
  sourcePath: string;
  roles: string[];
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
  private readonly cloudUsersFilePath: string;

  constructor(options: SamlSessionManagerOptions) {
    this.isCloud = options.isCloud;
    this.log = options.log;
    const hostOptionsWithoutAuth = {
      protocol: options.hostOptions.protocol,
      hostname: options.hostOptions.hostname,
      port: options.hostOptions.port,
    };
    this.kbnHost = Url.format(hostOptionsWithoutAuth);
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

  private getSessionByRole = async (role: string) => {
    if (this.sessionCache.has(role)) {
      return this.sessionCache.get(role)!;
    }

    // Validate role before creating SAML session
    if (this.supportedRoles && !this.supportedRoles.roles.includes(role)) {
      throw new Error(
        `Role '${role}' is not in the supported list: ${this.supportedRoles.roles.join(
          ', '
        )}. Add role descriptor in ${this.supportedRoles.sourcePath} to enable it for testing`
      );
    }

    let session: Session;

    if (this.isCloud) {
      this.log.debug(`new cloud SAML authentication with '${role}' role`);
      const kbnVersion = await this.kbnClient.version.get();
      const { email, password } = this.getCloudUserByRole(role);
      session = await createCloudSAMLSession({
        email,
        password,
        kbnHost: this.kbnHost,
        kbnVersion,
        log: this.log,
      });
    } else {
      this.log.debug(`new fake SAML authentication with '${role}' role`);
      session = await createLocalSAMLSession({
        username: `elastic_${role}`,
        email: `elastic_${role}@elastic.co`,
        fullname: `test ${role}`,
        role,
        kbnHost: this.kbnHost,
        log: this.log,
      });
    }

    this.sessionCache.set(role, session);
    return session;
  };

  async getApiCredentialsForRole(role: string) {
    const session = await this.getSessionByRole(role);
    return { Cookie: `sid=${session.getCookieValue()}` };
  }

  async getInteractiveUserSessionCookieWithRoleScope(role: string) {
    const session = await this.getSessionByRole(role);
    return session.getCookieValue();
  }

  async getEmail(role: string) {
    const session = await this.getSessionByRole(role);
    return session.email;
  }

  async getUserData(role: string) {
    const { cookie } = await this.getSessionByRole(role);
    const profileData = await getSecurityProfile({ kbnHost: this.kbnHost, cookie, log: this.log });
    return profileData;
  }
}
