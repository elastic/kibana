/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';

import { fetchSessionCookie } from '@kbn/ftr-common-functional-services';
import { FtrService } from './ftr_context_provider';

export interface Credentials {
  username: string;
  password: string;
}

export class AuthService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  public async login(credentials?: Credentials) {
    const baseUrl = Url.format({
      protocol: this.config.get('servers.kibana.protocol'),
      hostname: this.config.get('servers.kibana.hostname'),
      port: this.config.get('servers.kibana.port'),
    });
    const provider = this.isCloud() ? 'cloud-basic' : 'basic';
    const kbnVersion = await this.kibanaServer.version.get();
    const username = credentials?.username ?? this.getUsername();
    const password = credentials?.password ?? this.getPassword();

    this.log.info(`fetching auth cookie from ${baseUrl}/internal/security/login`);
    const cookie = await fetchSessionCookie({ baseUrl, username, password, kbnVersion, provider });
    this.log.info('captured auth cookie');
    return cookie;
  }

  public getUsername() {
    return this.config.get('servers.kibana.username');
  }

  public getPassword() {
    return this.config.get('servers.kibana.password');
  }

  public isCloud() {
    return this.config.get('servers.kibana.hostname') !== 'localhost';
  }

  public isServerless() {
    return !!this.config.get('serverless');
  }
}
