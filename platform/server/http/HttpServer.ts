import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as http from 'http';

import { Env } from '../../config';
import { Logger } from '../../logging';
import { Router } from './Router';

export class HttpServer {
  private readonly app: express.Application;
  private readonly httpServer: http.Server;

  constructor(private readonly log: Logger, private readonly env: Env) {
    this.app = express();

    this.app.use([
      bodyParser.json(),
      bodyParser.raw({ type: 'application/x-ndjson' }),
      bodyParser.urlencoded({ extended: false })
    ]);

    this.httpServer = http.createServer(this.app);
  }

  isListening() {
    return this.httpServer.listening;
  }

  registerRouter(router: Router<any>) {
    this.app.use(router.path, router.router);
  }

  start(port: number, host: string) {
    return new Promise((resolve, reject) => {
      // We register Kibana proxy middleware right before we start server to allow
      // all new platform plugins register their endpoints, so that kbnServer
      // handles only requests that aren't handled by the new platform.
      const kibanaServer = this.env.getKbnServer();
      if (kibanaServer) {
        this.app.use(this.kibanaProxyMiddleware(kibanaServer));
      }

      this.httpServer.listen(port, host, (err?: Error) => {
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  stop() {
    this.httpServer.close();
  }

  private kibanaProxyMiddleware(kibanaServer: any): express.RequestHandler {
    const basePath = kibanaServer.server.config().get('server.basePath');

    return (req, res) => {
      let url = req.url;
      if (url.startsWith(basePath)) {
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
