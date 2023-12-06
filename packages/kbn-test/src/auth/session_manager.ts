/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import Url from 'url';
import type { Config } from '../functional_test_runner';
import { KbnClient } from '../kbn_client';
import { getProjectType, readCloudUsersFromFile } from './helper';
import { createCloudSAMLSession, createLocalSAMLSession, Session } from './saml_auth';

export interface User {
  readonly email: string;
  readonly password: string;
}

export type Role = string;

export class SAMLSessionManager {
  private readonly config: Config;
  private readonly log: ToolingLog;
  private readonly sessionCache;
  private readonly isCloud: boolean;
  private readonly kbnHost: string;
  private readonly kbnClient: KbnClient;
  private readonly roleToUserMap: Map<string, User>;
  private readonly svlProjectType: string;
  constructor(config: Config, log: ToolingLog, isCloud: boolean) {
    this.config = config;
    this.log = log;
    this.sessionCache = new Map<Role, Session>();
    this.isCloud = isCloud;
    this.roleToUserMap = new Map<string, User>();

    const hostOptions = {
      protocol: this.config.get('servers.kibana.protocol'),
      hostname: this.config.get('servers.kibana.hostname'),
      port: isCloud ? undefined : this.config.get('servers.kibana.port'),
    };
    this.kbnHost = Url.format(hostOptions);
    this.kbnClient = new KbnClient({
      log: this.log,
      url: Url.format({
        ...hostOptions,
        auth: `${this.config.get('servers.kibana.username')}:${this.config.get(
          'servers.kibana.password'
        )}`,
      }),
    });
    this.svlProjectType = getProjectType(this.config.get('kbnTestServer.serverArgs'));
  }

  // we should split packages/kbn-es/src/serverless_resources/roles.yml into 3 different files

  // getLocalUsers = () => {
  //   const rolesDefinitionFilePath = resolve(
  //     REPO_ROOT,
  //     'packages/kbn-es/src/serverless_resources/roles.yml'
  //   );
  //   const roles: string[] = Object.keys(loadYaml(fs.readFileSync(rolesDefinitionFilePath, 'utf8')));
  // };

  private getCloudUsers = () => {
    // Loading cloud users on the first call
    if (this.roleToUserMap.size === 0) {
      const data = readCloudUsersFromFile();
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
      throw new Error(`User with '${role}' role is not defined for ${this.svlProjectType} project`);
    }
  };

  private getSessionByRole = async (role: string) => {
    if (this.sessionCache.has(role)) {
      return this.sessionCache.get(role)!;
    }

    let session: Session;
    const kbnVersion = await this.kbnClient.version.get();
    if (this.isCloud) {
      this.log.debug(`new SAML authentication with '${role}' role`);
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

  async getSessionCookieForRole(role: string) {
    const session = await this.getSessionByRole(role);
    return session.getCookieValue();
  }

  async getUserData(role: string) {
    const { email, fullname } = await this.getSessionByRole(role);
    return { email, fullname };
  }
}
