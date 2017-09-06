import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import * as https from 'https';
import { promisify } from 'util';
import { readFileSync } from 'fs';

import { HttpConfig } from './HttpConfig';
import { Env } from '../../config';
import { Logger } from '../../logging';
import { Router } from './Router';

export class HttpServer {
  private readonly app: express.Application;
  private server: http.Server | https.Server | null = null;

  constructor(private readonly log: Logger, private readonly env: Env) {
    this.app = express();

    this.app.use([
      bodyParser.json(),
      bodyParser.raw({ type: 'application/x-ndjson' }),
      bodyParser.urlencoded({ extended: false })
    ]);
  }

  isListening() {
    return this.server && this.server.listening;
  }

  registerRouter(router: Router<any>) {
    this.app.use(router.path, router.router);
  }

  start(config: HttpConfig) {
    // We register Kibana proxy middleware right before we start server to allow
    // all new platform plugins register their endpoints, so that kbnServer
    // handles only requests that aren't handled by the new platform.
    const kibanaServer = this.env.getKbnServer();
    if (kibanaServer) {
      this.app.use(this.kibanaProxyMiddleware(kibanaServer));
    }

    this.log.info(`starting http server [${config.host}:${config.port}]`);

    if (config.ssl.enabled) {
      this.server = https.createServer(
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
    } else {
      this.server = http.createServer(this.app);
    }

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

  private kibanaProxyMiddleware(kibanaServer: any): express.RequestHandler {
    const basePath = kibanaServer.server.config().get('server.basePath');

    return (req, res) => {
      let url = req.url;
      if (basePath && url.startsWith(`${basePath}/`)) {
        url = url.substring(basePath.length);
      }

      this.log.info(
        `Forwarding request ${req.method}:${req.url} to ${req.method}:${url}`
      );

      kibanaServer.server.inject(
        {
          method: req.method,
          headers: req.headers,
          payload: req.body,
          url
        },
        (hapiResponse: any) => {
          for (const [headerKey, headerValue] of Object.entries(
            hapiResponse.headers
          )) {
            res.header(headerKey, headerValue);
          }
          res.status(hapiResponse.statusCode);
          res.send(hapiResponse.rawPayload);
        }
      );
    };
  }
}
