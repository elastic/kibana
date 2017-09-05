import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import { Env } from '../../config';
import { Logger } from '../../logging';
import { Router } from './Router';

export class HttpServer {
  private readonly app: express.Application;
  private readonly httpServer: http.Server;
  private readonly kibanaServer: any;
  private readonly basePath: string;

  constructor(private readonly log: Logger, private readonly env: Env) {
    this.app = express();
    this.app.use([
      bodyParser.json(),
      bodyParser.urlencoded({ extended: false })
    ]);

    this.kibanaServer = this.env.getKbnServer();
    this.basePath = this.kibanaServer.server.config().get('server.basePath');

    if (this.kibanaServer) {
      this.app.all('/*', (req, res) => this.proxyKibana(req, res));

      const basePath = this.kibanaServer.server.config().get('server.basePath');
      if (basePath) {
        this.app.all(`${basePath}/*`, (req, res) => this.proxyKibana(req, res));
      }
    }

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

  private proxyKibana(req: any, res: any) {
    let url = req.url;
    if (url.startsWith(this.basePath)) {
      url = url.substring(this.basePath.length);
    }

    this.log.info(`Forwarding request ${req.method}:${req.url} to ${req.method}:${url}`);

    this.env.getKbnServer().server.inject({
      method: req.method,
      headers: req.headers,
      payload: req.body,
      url,
    }, (hapiResponse: any) => {
      for (const [headerKey, headerValue] of Object.entries(hapiResponse.headers)) {
        res.header(headerKey, headerValue);
      }
      res.status(hapiResponse.statusCode);
      res.send(hapiResponse.rawPayload);
    });
  }
}
