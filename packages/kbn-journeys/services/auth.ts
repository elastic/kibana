/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Url from 'url';
import { format } from 'util';

import axios, { AxiosResponse } from 'axios';
import { ToolingLog } from '@kbn/tooling-log';
import { Config } from '@kbn/test';
import { KibanaServer } from '@kbn/ftr-common-functional-services';

export interface Credentials {
  username: string;
  password: string;
}

function extractCookieValue(authResponse: AxiosResponse) {
  return authResponse.headers['set-cookie']?.[0].toString().split(';')[0].split('sid=')[1] ?? '';
}
export class Auth {
  constructor(
    private readonly config: Config,
    private readonly log: ToolingLog,
    private readonly kibanaServer: KibanaServer
  ) {}

  public async login({ username, password }: Credentials) {
    const baseUrl = new URL(
      Url.format({
        protocol: this.config.get('servers.kibana.protocol'),
        hostname: this.config.get('servers.kibana.hostname'),
        port: this.config.get('servers.kibana.port'),
      })
    );

    const loginUrl = new URL('/internal/security/login', baseUrl);
    const provider = baseUrl.hostname === 'localhost' ? 'basic' : 'cloud-basic';

    this.log.info('fetching auth cookie from', loginUrl.href);
    const authResponse = await axios.request({
      url: loginUrl.href,
      method: 'post',
      data: {
        providerType: 'basic',
        providerName: provider,
        currentURL: new URL('/login?next=%2F', baseUrl).href,
        params: { username, password },
      },
      headers: {
        'content-type': 'application/json',
        'kbn-version': await this.kibanaServer.version.get(),
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
      validateStatus: () => true,
      maxRedirects: 0,
    });

    const cookie = extractCookieValue(authResponse);
    if (cookie) {
      this.log.info('captured auth cookie');
    } else {
      this.log.error(
        format('unable to determine auth cookie from response', {
          status: `${authResponse.status} ${authResponse.statusText}`,
          body: authResponse.data,
          headers: authResponse.headers,
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
}
