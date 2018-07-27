/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { first, k$, toPromise } from '../../lib/kbn_observable';

import { Root } from '.';
import { DevConfig } from '../dev';
import { HttpConfig } from '../http';
import { BasePathProxyServer, BasePathProxyServerOptions } from '../http/base_path_proxy_server';

/**
 * Top-level entry point to start BasePathProxy server.
 */
export class BasePathProxyRoot extends Root {
  private basePathProxy?: BasePathProxyServer;

  public async configure({
    blockUntil,
    shouldRedirectFromOldBasePath,
  }: Pick<BasePathProxyServerOptions, 'blockUntil' | 'shouldRedirectFromOldBasePath'>) {
    const [devConfig, httpConfig] = await Promise.all([
      k$(this.configService.atPath('dev', DevConfig))(first(), toPromise()),
      k$(this.configService.atPath('server', HttpConfig))(first(), toPromise()),
    ]);

    this.basePathProxy = new BasePathProxyServer(this.logger.get('server'), {
      blockUntil,
      devConfig,
      httpConfig,
      shouldRedirectFromOldBasePath,
    });
  }

  public getBasePath() {
    return this.getBasePathProxy().basePath;
  }

  public getTargetPort() {
    return this.getBasePathProxy().targetPort;
  }

  protected async startServer() {
    return this.getBasePathProxy().start();
  }

  protected async stopServer() {
    await this.getBasePathProxy().stop();
    this.basePathProxy = undefined;
  }

  private getBasePathProxy() {
    if (this.basePathProxy === undefined) {
      throw new Error('BasePathProxyRoot is not configured!');
    }

    return this.basePathProxy;
  }
}
