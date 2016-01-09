import { Server } from 'hapi';
import { notFount } from 'boom';
import { merge, sample } from 'lodash';
import { format as formatUrl } from 'url';
import { fromNode } from 'bluebird';

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
    if (!this.basePath) {
      this.basePath = `/${sample(alphabet, 3).join('')}`;
      config.set('server.basePath', this.basePath);
    }

    setupLogging(null, this.server, config);
    setupConnection(null, this.server, config);
    this.setupRoutes();
  }

  setupRoutes() {
    const { server, basePath, targetPort } = this;

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
      handler: {
        proxy: {
          passThrough: true,
          xforward: true,
          mapUri(req, callback) {
            callback(null, formatUrl({
              protocol: server.info.protocol,
              hostname: '0.0.0.0',
              port: targetPort,
              pathname: req.params.kbnPath,
              query: req.query,
            }));
          }
        }
      }
    });
  }

  async listen() {
    await fromNode(cb => this.server.start(cb));
    this.server.log(['listening', 'info'], `basePath Proxy running at ${this.server.info.uri}${this.basePath}`);
  }

}
