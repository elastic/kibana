import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import { Server } from 'net';
import { promisify } from 'util';
import { readFileSync } from 'fs';

import { HttpConfig } from './HttpConfig';
import { Env } from '../../config';
import { Logger } from '../../logging';
import { Router } from './Router';

export class HttpServer {
  private readonly app: express.Application;
  private server?: Server;

  constructor(private readonly log: Logger, private readonly env: Env) {
    this.app = express();
  }

  isListening() {
    return this.server !== undefined && this.server.listening;
  }

  registerRouter(router: Router<any>) {
    this.app.use(router.path, router.router);
  }

  async start(config: HttpConfig) {
    const server = this.initializeServer(config);

    this.server = server;

    const legacyKbnServer = this.env.getLegacyKbnServer();
    if (legacyKbnServer !== undefined) {
      legacyKbnServer.newPlatformProxyListener.bind(server);

      // We register Kibana proxy middleware right before we start server to allow
      // all new platform plugins register their endpoints, so that kbnServer
      // handles only requests that aren't handled by the new platform.
      this.app.use((req, res) =>
        legacyKbnServer.newPlatformProxyListener.proxy(req, res)
      );
    }

    this.log.info(`starting http server [${config.host}:${config.port}]`);

    await promisify(server.listen).call(this.server, config.port, config.host);
  }

  async stop() {
    this.log.info('stopping http server');

    if (this.server === undefined) {
      return;
    }

    await promisify(this.server.close).call(this.server);

    this.server = undefined;
  }

  private initializeServer(config: HttpConfig) {
    // TODO This was forced to `any` because of the following problem with the
    // express declaration file, and can be removed once that is fixed:
    //
    // ```
    // Argument of type 'Application' is not assignable to parameter of type
    // '((request: IncomingMessage, response: ServerResponse) => void) | undefined'
    // ```
    const app = this.app as any;

    if (!config.ssl.enabled) {
      return http.createServer(app);
    }

    // TODO: add support for `secureOptions`.
    return https.createServer(
      {
        key: readFileSync(config.ssl.key!),
        cert: readFileSync(config.ssl.certificate!),
        ca:
          config.ssl.certificateAuthorities &&
          config.ssl.certificateAuthorities.map(caFilePath =>
            readFileSync(caFilePath)
          ),
        passphrase: config.ssl.keyPassphrase,
        ciphers: config.ssl.cipherSuites.join(':'),
        // We use the server's cipher order rather than the client's to prevent the BEAST attack.
        honorCipherOrder: true
      },
      app
    );
  }
}
