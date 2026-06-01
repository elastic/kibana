/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import { format } from 'util';

import { FtrService } from './ftr_context_provider';

export interface Credentials {
  username: string;
  password: string;
}

function extractCookieValue(headers: Headers) {
  // Headers.getSetCookie() is the Node 22 / undici API; fall back to Headers.get for
  // older runtimes (jsdom in the test config).
  const headersWithGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const firstSetCookie = headersWithGetSetCookie.getSetCookie
    ? headersWithGetSetCookie.getSetCookie()[0]
    : headers.get('set-cookie');
  return firstSetCookie?.split(';')[0].split('sid=')[1] ?? '';
}
export class AuthService extends FtrService {
  private readonly config = this.ctx.getService('config');
  private readonly log = this.ctx.getService('log');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  public async login(credentials?: Credentials) {
    const baseUrl = new URL(
      Url.format({
        protocol: this.config.get('servers.kibana.protocol'),
        hostname: this.config.get('servers.kibana.hostname'),
        port: this.config.get('servers.kibana.port'),
      })
    );
    const loginUrl = new URL('/internal/security/login', baseUrl);
    const provider = this.isCloud() ? 'cloud-basic' : 'basic';

    const version = await this.kibanaServer.version.get();

    this.log.info('fetching auth cookie from', loginUrl.href);
    const authResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'kbn-version': version,
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-elastic-internal-origin': 'Kibana',
      },
      body: JSON.stringify({
        providerType: 'basic',
        providerName: provider,
        currentURL: new URL('/login?next=%2F', baseUrl).href,
        params: credentials ?? { username: this.getUsername(), password: this.getPassword() },
      }),
      redirect: 'manual',
    });

    if (authResponse.status !== 200) {
      throw new Error(
        `Kibana auth failed: code: ${authResponse.status}, message: ${authResponse.statusText}`
      );
    }

    const cookie = extractCookieValue(authResponse.headers);
    if (cookie) {
      this.log.info('captured auth cookie');
    } else {
      this.log.error(
        format('unable to determine auth cookie from response', {
          status: `${authResponse.status} ${authResponse.statusText}`,
          body: await authResponse.text(),
          headers: Object.fromEntries(authResponse.headers.entries()),
        })
      );

      throw new Error(`failed to determine auth cookie`);
    }

    return {
      name: 'sid',
      value: cookie,
      url: baseUrl.href,
    };
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
