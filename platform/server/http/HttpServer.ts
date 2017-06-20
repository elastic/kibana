import * as express from 'express';
import * as http from 'http';
import { Router } from './Router';

export class HttpServer {
  private readonly app: express.Application;
  private readonly httpServer: http.Server;

  constructor() {
    this.app = express();
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
}
