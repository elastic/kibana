import { readFileSync } from 'fs';
import { Request, ResponseToolkit, Server, ServerOptions } from 'hapi-latest';
import { ServerOptions as TLSOptions } from 'https';
import { format as formatUrl } from 'url';

import { modifyUrl } from '../../utils';
import { Env } from '../config';
import { Logger } from '../logging';
import { HttpConfig } from './http_config';
import { Router } from './router';

export class HttpServer {
  private server?: Server;
  private redirectServer?: Server;
  private registeredRouters: Set<Router> = new Set();

  constructor(private readonly log: Logger, private readonly env: Env) {}

  public isListening() {
    return this.server !== undefined && this.server.listener.listening;
  }

  public registerRouter(router: Router) {
    if (this.isListening()) {
      throw new Error(
        'Routers can be registered only when HTTP server is stopped.'
      );
    }

    this.registeredRouters.add(router);
  }

  public async start(config: HttpConfig) {
    this.server = this.initializeServer(config);

    // If a redirect port is specified, we start an http server at this port and
    // redirect all requests to the ssl port.
    if (config.ssl.enabled && config.ssl.redirectHttpFromPort !== undefined) {
      await this.setupRedirectServer(config);
    }

    this.setupBasePathRewrite(this.server, config);

    for (const router of this.registeredRouters) {
      for (const route of router.getRoutes()) {
        this.server.route({
          handler: route.handler,
          method: route.method,
          path: this.getRouteFullPath(router.path, route.path),
        });
      }
    }

    const legacyKbnServer = this.env.getLegacyKbnServer();
    if (legacyKbnServer !== undefined) {
      legacyKbnServer.newPlatformProxyListener.bind(this.server.listener);

      // We register Kibana proxy middleware right before we start server to allow
      // all new platform plugins register their routes, so that `legacyKbnServer`
      // handles only requests that aren't handled by the new platform.
      this.server.route({
        handler: ({ raw: { req, res } }, responseToolkit) => {
          legacyKbnServer.newPlatformProxyListener.proxy(req, res);
          return responseToolkit.abandon;
        },
        method: '*',
        options: {
          payload: {
            output: 'stream',
            parse: false,
            timeout: false,
          },
        },
        path: '/{p*}',
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

  public async stop() {
    this.log.info('stopping http server');

    if (this.server !== undefined) {
      await this.server.stop();
      this.server = undefined;
    }

    if (this.redirectServer !== undefined) {
      await this.redirectServer.stop();
      this.redirectServer = undefined;
    }
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
            abortEarly: false,
          },
        },
      },
      state: {
        strictHeader: false,
      },
    };

    const ssl = config.ssl;
    if (ssl.enabled) {
      const tlsOptions: TLSOptions = {
        ca:
          config.ssl.certificateAuthorities &&
          config.ssl.certificateAuthorities.map(caFilePath =>
            readFileSync(caFilePath)
          ),

        cert: readFileSync(ssl.certificate!),
        ciphers: config.ssl.cipherSuites.join(':'),
        // We use the server's cipher order rather than the client's to prevent the BEAST attack.
        honorCipherOrder: true,

        key: readFileSync(ssl.key!),
        passphrase: ssl.keyPassphrase,
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
    server.ext(
      'onRequest',
      (request: Request, responseToolkit: ResponseToolkit) => {
        const newURL = modifyUrl(request.url.href!, urlParts => {
          if (
            urlParts.pathname != null &&
            urlParts.pathname.startsWith(basePath)
          ) {
            urlParts.pathname = urlParts.pathname.replace(basePath, '') || '/';
          } else {
            return {};
          }
        });

        if (!newURL) {
          return responseToolkit
            .response('Not Found')
            .code(404)
            .takeover();
        }

        request.setUrl(newURL);
        // We should update raw request as well since it can be proxied to the old platform
        // where base path isn't expected.
        request.raw.req.url = request.url.href;

        return responseToolkit.continue;
      }
    );
  }

  private async setupRedirectServer(config: HttpConfig) {
    this.log.info(
      `starting HTTP --> HTTPS redirect server [${config.host}:${
        config.ssl.redirectHttpFromPort
      }]`
    );

    this.redirectServer = new Server({
      host: config.host,
      port: config.ssl.redirectHttpFromPort,
    });

    this.redirectServer.ext(
      'onRequest',
      (request: Request, responseToolkit: ResponseToolkit) => {
        return responseToolkit
          .redirect(
            formatUrl({
              hostname: config.host,
              pathname: request.url.pathname,
              port: config.port,
              protocol: 'https',
              search: request.url.search,
            })
          )
          .takeover();
      }
    );

    try {
      await this.redirectServer.start();
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        throw new Error(
          'The redirect server failed to start up because port ' +
            `${
              config.ssl.redirectHttpFromPort
            } is already in use. Ensure the port specified ` +
            'in `server.ssl.redirectHttpFromPort` is available.'
        );
      } else {
        throw err;
      }
    }
  }

  private getRouteFullPath(routerPath: string, routePath: string) {
    // If router's path ends with slash and route's path starts with slash,
    // we should omit one of them to have a valid concatenated path.
    const routePathStartIndex =
      routerPath.endsWith('/') && routePath.startsWith('/') ? 1 : 0;
    return `${routerPath}${routePath.slice(routePathStartIndex)}`;
  }
}
