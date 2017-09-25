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
  private server: Server | null = null;

  constructor(private readonly log: Logger, private readonly env: Env) {
    this.app = express();

    // We will register body parser only for routes defined in the new platform.
    /*this.app.use([
      bodyParser.json(),
      bodyParser.raw({ type: 'application/x-ndjson' }),
      bodyParser.urlencoded({ extended: false })
    ]);*/
  }

  isListening() {
    return this.server !== null && this.server.listening;
  }

  registerRouter(router: Router<any>) {
    this.app.use(router.path, router.router);
  }

  async start(config: HttpConfig) {
    this.server = this.initializeServer(config);

    const proxy = this.env.getProxy();
    if (proxy) {
      proxy.bind(this.server);

      // We register Kibana proxy middleware right before we start server to allow
      // all new platform plugins register their endpoints, so that kbnServer
      // handles only requests that aren't handled by the new platform.
      this.app.use((req, res) => proxy.proxy(req, res));
    }

    this.log.info(`starting http server [${config.host}:${config.port}]`);

    return promisify(this.server.listen).call(
      this.server,
      config.port,
      config.host
    );
  }

  stop() {
    this.log.info('stopping http server');

    if (!this.server) {
      return;
    }

    this.server.close();
    this.server = null;
  }

  private initializeServer(config: HttpConfig) {
    if (!config.ssl.enabled) {
      return http.createServer(this.app);
    }

    return https.createServer(
      {
        key: readFileSync(config.ssl.key!),
        cert: readFileSync(config.ssl.certificate!),
        ca:
          config.ssl.certificateAuthorities &&
          config.ssl.certificateAuthorities!.map(caFilePath =>
            readFileSync(caFilePath)
          ),
        passphrase: config.ssl.keyPassphrase,
        ciphers: config.ssl.cipherSuites.join(':'),
        // We use the server's cipher order rather than the client's to prevent the BEAST attack.
        honorCipherOrder: true
      },
      this.app
    );
  }
}
