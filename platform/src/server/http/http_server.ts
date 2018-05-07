import { Request, ResponseToolkit, Server, ServerOptions } from 'hapi';
import { ServerOptions as TLSOptions} from 'https';
import { readFileSync } from 'fs';

import { HttpConfig } from './http_config';
import { Env } from '../../config';
import { Logger } from '../../logging';
import { Router } from './router';
import { modifyUrl } from '../../lib/utils/url';

export class HttpServer {
  private server?: Server;
  private registeredRouters: Set<Router> = new Set();

  constructor(private readonly log: Logger, private readonly env: Env) {
  }

  isListening() {
    return this.server !== undefined && this.server.listener.listening;
  }

  registerRouter(router: Router) {
    if (this.isListening()) {
      throw new Error('Routers can be registered only when HTTP server is stopped.')
    }

    this.registeredRouters.add(router);
  }

  async start(config: HttpConfig) {
    this.server = this.initializeServer(config);

    this.setupBasePathRewrite(this.server, config);

    for (const router of this.registeredRouters) {
      for (const route of router.getRoutes()) {
        this.server.route({
          method: route.method,
          path: `${router.path}${route.path}`,
          handler: route.handler,
        });
      }
    }

    const legacyKbnServer = this.env.getLegacyKbnServer();
    if (legacyKbnServer !== undefined) {
      legacyKbnServer.newPlatformProxyListener.bind(this.server.listener);

      // We register Kibana proxy middleware right before we start server to allow
      // all new platform plugins register their routes, so that kbnServer
      // handles only requests that aren't handled by the new platform.
      this.server.route({
        method: '*',
        path: '/{p*}',
        options: {
          payload: {
            output: 'stream',
            parse: false,
            timeout: false,
          }
        },
        handler: ({ raw: { req, res }}, responseToolkit) => {
          legacyKbnServer.newPlatformProxyListener.proxy(req, res);
          return responseToolkit.abandon;
        },
      });
    }

    this.server.listener.on('clientError', (err, socket) => {
      if (socket.writable) {
        socket.end(new Buffer('HTTP/1.1 400 Bad Request\r\n\r\n', 'ascii'));
      } else {
        socket.destroy(err);
      }
    });

    this.log.info(`starting http server [${config.host}:${config.port}]`);

    await this.server.start();
  }

  async stop() {
    this.log.info('stopping http server');

    if (this.server === undefined) {
      return;
    }

    await this.server.stop();
    this.server = undefined;
  }

  private initializeServer(config: HttpConfig) {
    const options: ServerOptions = {
      host: config.host,
      port: config.port,
      routes: {
        cors: config.cors,
        payload: {
          maxBytes: config.maxPayload.getValueInBytes(),
        },
        validate: {
          options: {
            abortEarly: false
          }
        }
      },
      state: {
        strictHeader: false
      },
    };

    const ssl = config.ssl;
    if (ssl.enabled) {
      const tlsOptions: TLSOptions = {
        ca: config.ssl.certificateAuthorities &&
          config.ssl.certificateAuthorities.map(caFilePath => readFileSync(caFilePath)),

        key: readFileSync(ssl.key!),
        cert: readFileSync(ssl.certificate!),
        passphrase: ssl.keyPassphrase,

        ciphers: config.ssl.cipherSuites.join(':'),
        // We use the server's cipher order rather than the client's to prevent the BEAST attack.
        honorCipherOrder: true,
        secureOptions: ssl.getSecureOptions(),
      };

      // TODO: Hapi types have a typo in `tls` property type definition: `https.RequestOptions` is used instead of
      // `https.ServerOptions`, and `honorCipherOrder` isn't presented in `https.RequestOptions`.
      options.tls = tlsOptions as any;
    }

    return new Server(options);
  }

  private setupBasePathRewrite(server: Server, config: HttpConfig) {
    if (config.basePath === undefined || !config.rewriteBasePath) {
      return;
    }

    const basePath = config.basePath;
    server.ext('onRequest', (request: Request, responseToolkit: ResponseToolkit) => {
      const newURL = modifyUrl(request.url.href!, (urlParts) => {
        if (urlParts.pathname != null && urlParts.pathname.startsWith(basePath)) {
          urlParts.pathname = urlParts.pathname.replace(basePath, '') || '/';
        } else {
          return {};
        }
      });

      if (!newURL) {
        return responseToolkit.response('Not Found').code(404);
      }

      request.setUrl(newURL);
      // We should update raw request as well since it can be proxied to the old platform
      // where base path isn't expected.
      request.raw.req.url = request.url.href;

      return responseToolkit.continue;
    });
  }
}
