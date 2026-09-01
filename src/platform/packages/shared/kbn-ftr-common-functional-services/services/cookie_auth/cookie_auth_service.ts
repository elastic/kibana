/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import { FtrService } from '../ftr_provider_context';
import { fetchSessionCookie } from './fetch_session_cookie';

export type { SessionCookie as Cookie } from './fetch_session_cookie';

const TEST_USER_NAME = 'test_user';
const TEST_USER_PASSWORD = 'changeme';

/**
 * Generates a Kibana session cookie (`sid`) by posting to the internal basic-auth login endpoint.
 * Works for both local (`basic` provider) and Cloud (`cloud-basic` provider) deployments.
 *
 * This is purely HTTP — no browser dependency. Consumed by BrowserAuthService (browser-side
 * cookie injection) and directly by API-level test helpers.
 */
export class CookieAuthService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  private getBaseUrl(): string {
    return Url.format({
      protocol: this.config.get('servers.kibana.protocol'),
      hostname: this.config.get('servers.kibana.hostname'),
      port: this.config.get('servers.kibana.port'),
    });
  }

  isCloud(): boolean {
    return this.config.get('servers.kibana.hostname') !== 'localhost';
  }

  async getCookieForUser(username: string, password: string) {
    const baseUrl = this.getBaseUrl();
    const provider = this.isCloud() ? 'cloud-basic' : 'basic';
    const kbnVersion = await this.kibanaServer.version.get();

    this.log.info(
      `[cookieAuth] fetching auth cookie for '${username}' from ${baseUrl}/internal/security/login`
    );
    const cookie = await fetchSessionCookie({ baseUrl, username, password, kbnVersion, provider });
    this.log.info(`[cookieAuth] captured auth cookie for '${username}'`);
    return cookie;
  }

  /** Cookie for the shared FTR test_user (username: test_user, password: changeme). */
  async getCookieForTestUser() {
    return this.getCookieForUser(TEST_USER_NAME, TEST_USER_PASSWORD);
  }

  /** Cookie for the Kibana server user configured in `servers.kibana.username/password`. */
  async getCookieForKibanaUser() {
    return this.getCookieForUser(
      this.config.get('servers.kibana.username'),
      this.config.get('servers.kibana.password')
    );
  }
}
