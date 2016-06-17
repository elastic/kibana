import { Server } from 'hapi';
import { notFound } from 'boom';
import { merge, sample } from 'lodash';
import { format as formatUrl } from 'url';
import { map, fromNode } from 'bluebird';
import { Agent as HttpsAgent } from 'https';
import { readFileSync } from 'fs';

import Config from '../../server/config/config';
import setupConnection from '../../server/http/setup_connection';
import setupLogging from '../../server/logging';

const alphabet = 'abcdefghijklmnopqrztuvwxyz'.split('');

export default class BasePathProxy {
  constructor(clusterManager, userSettings) {
    this.clusterManager = clusterManager;
    this.server = new Server();

    const config = Config.withDefaultSchema(userSettings);

    this.targetPort = config.get('dev.basePathProxyTarget');
    this.basePath = config.get('server.basePath');

    const { cert } = config.get('server.ssl');
    if (cert) {
      this.proxyAgent = new HttpsAgent({
        ca: readFileSync(cert)
      });
    }

    if (!this.basePath) {
      this.basePath = `/${sample(alphabet, 3).join('')}`;
      config.set('server.basePath', this.basePath);
    }

    const ONE_GIGABYTE = 1024 * 1024 * 1024;
    config.set('server.maxPayloadBytes', ONE_GIGABYTE);

    setupLogging(null, this.server, config);
    setupConnection(null, this.server, config);
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
            map(clusterManager.workers, worker => {
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
          mapUri(req, callback) {
            callback(null, formatUrl({
              protocol: server.info.protocol,
              hostname: server.info.host,
              port: targetPort,
              pathname: req.params.kbnPath,
              query: req.query,
            }));
          }
        }
      }
    });

    server.route({
      method: '*',
      path: `/{oldBasePath}/{kbnPath*}`,
      handler(req, reply) {
        const {oldBasePath, kbnPath = ''} = req.params;

        const isGet = req.method === 'get';
        const isBasePath = oldBasePath.length === 3;
        const isApp = kbnPath.slice(0, 4) === 'app/';

        if (isGet && isBasePath && isApp) {
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
