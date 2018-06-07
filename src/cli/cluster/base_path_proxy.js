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

import { Server } from 'hapi';
import { notFound } from 'boom';
import { map, sample } from 'lodash';
import { map as promiseMap, fromNode } from 'bluebird';
import { Agent as HttpsAgent } from 'https';
import { readFileSync } from 'fs';

import { setupConnection } from '../../server/http/setup_connection';
import { registerHapiPlugins } from '../../server/http/register_hapi_plugins';
import { setupLogging } from '../../server/logging';

const alphabet = 'abcdefghijklmnopqrztuvwxyz'.split('');

export default class BasePathProxy {
  constructor(clusterManager, config) {
    this.clusterManager = clusterManager;
    this.server = new Server();

    this.targetPort = config.get('dev.basePathProxyTarget');
    this.basePath = config.get('server.basePath');

    const sslEnabled = config.get('server.ssl.enabled');
    if (sslEnabled) {
      this.proxyAgent = new HttpsAgent({
        key: readFileSync(config.get('server.ssl.key')),
        passphrase: config.get('server.ssl.keyPassphrase'),
        cert: readFileSync(config.get('server.ssl.certificate')),
        ca: map(config.get('server.ssl.certificateAuthorities'), readFileSync),
        rejectUnauthorized: false
      });
    }

    if (!this.basePath) {
      this.basePath = `/${sample(alphabet, 3).join('')}`;
      config.set('server.basePath', this.basePath);
    }

    const ONE_GIGABYTE = 1024 * 1024 * 1024;
    config.set('server.maxPayloadBytes', ONE_GIGABYTE);

    setupLogging(this.server, config);
    setupConnection(this.server, config);
    registerHapiPlugins(this.server, config);

    this.setupRoutes();
  }

  setupRoutes() {
    const { clusterManager, server, basePath, targetPort } = this;

    server.route({
      method: 'GET',
      path: '/',
      handler(req, reply) {
        return reply.redirect(basePath);
      }
    });

    server.route({
      method: '*',
      path: `${basePath}/{kbnPath*}`,
      config: {
        pre: [
          (req, reply) => {
            promiseMap(clusterManager.workers, worker => {
              if (worker.type === 'server' && !worker.listening && !worker.crashed) {
                return fromNode(cb => {
                  const done = () => {
                    worker.removeListener('listening', done);
                    worker.removeListener('crashed', done);
                    cb();
                  };

                  worker.on('listening', done);
                  worker.on('crashed', done);
                });
              }
            })
              .return(undefined)
              .nodeify(reply);
          }
        ],
      },
      handler: {
        proxy: {
          passThrough: true,
          xforward: true,
          agent: this.proxyAgent,
          protocol: server.info.protocol,
          host: server.info.host,
          port: targetPort,
        }
      }
    });

    server.route({
      method: '*',
      path: `/{oldBasePath}/{kbnPath*}`,
      handler(req, reply) {
        const { oldBasePath, kbnPath = '' } = req.params;

        const isGet = req.method === 'get';
        const isBasePath = oldBasePath.length === 3;
        const isApp = kbnPath.startsWith('app/');
        const isKnownShortPath = ['login', 'logout', 'status'].includes(kbnPath);

        if (isGet && isBasePath && (isApp || isKnownShortPath)) {
          return reply.redirect(`${basePath}/${kbnPath}`);
        }

        return reply(notFound());
      }
    });
  }

  async listen() {
    await fromNode(cb => this.server.start(cb));
    this.server.log(['listening', 'info'], `basePath Proxy running at ${this.server.info.uri}${this.basePath}`);
  }

}
