import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import { promisify } from 'util';
import { Router } from './Router';

export class HttpServer {
  private readonly app: express.Application;
  private readonly httpServer: http.Server;

  constructor() {
    this.app = express();
    this.app.use([
      bodyParser.json(),
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
    return promisify(this.httpServer.listen).call(this.httpServer, port, host);
  }

  stop() {
    this.httpServer.close();
  }
}
