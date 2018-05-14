import { Request, ResponseToolkit, Server, ServerOptions } from 'hapi';
import { ServerOptions as TLSOptions } from 'https';
import { readFileSync } from 'fs';
import { format as formatUrl } from 'url';

import { HttpConfig } from './http_config';
import { Env } from '../../config';
import { Logger } from '../../logging';
import { Router } from './router';
import { modifyUrl } from '../../lib/utils/url';

export class HttpServer {
  private _server?: Server;
  private _redirectServer?: Server;
  private _registeredRouters: Set<Router> = new Set();

  constructor(private readonly _log: Logger, private readonly _env: Env) {}

  isListening() {
    return this._server !== undefined && this._server.listener.listening;
  }

  registerRouter(router: Router) {
    if (this.isListening()) {
      throw new Error(
        'Routers can be registered only when HTTP server is stopped.'
      );
    }

    this._registeredRouters.add(router);
  }

  async start(config: HttpConfig) {
    this._server = this.initializeServer(config);

    // If a redirect port is specified, we start an http server at this port and
    // redirect all requests to the ssl port.
    if (config.ssl.enabled && config.ssl.redirectHttpFromPort !== undefined) {
      await this._setupRedirectServer(config);
    }

    this._setupBasePathRewrite(this._server, config);

    for (const router of this._registeredRouters) {
      for (const route of router.getRoutes()) {
        this._server.route({
          method: route.method,
          path: this._getRouteFullPath(router.path, route.path),
          handler: route.handler,
        });
      }
    }

    const legacyKbnServer = this._env.getLegacyKbnServer();
    if (legacyKbnServer !== undefined) {
      legacyKbnServer.newPlatformProxyListener.bind(this._server.listener);

      // We register Kibana proxy middleware right before we start server to allow
      // all new platform plugins register their routes, so that `legacyKbnServer`
      // handles only requests that aren't handled by the new platform.
      this._server.route({
        method: '*',
        path: '/{p*}',
        options: {
          payload: {
            output: 'stream',
            parse: false,
            timeout: false,
          },
        },
        handler: ({ raw: { req, res } }, responseToolkit) => {
          legacyKbnServer.newPlatformProxyListener.proxy(req, res);
          return responseToolkit.abandon;
        },
      });
    }

    this._server.listener.on('clientError', (err, socket) => {
      if (socket.writable) {
        socket.end(new Buffer('HTTP/1.1 400 Bad Request\r\n\r\n', 'ascii'));
      } else {
        socket.destroy(err);
      }
    });

    this._log.info(`starting http server [${config.host}:${config.port}]`);

    await this._server.start();
  }

  async stop() {
    this._log.info('stopping http server');

    if (this._server !== undefined) {
      await this._server.stop();
      this._server = undefined;
    }

    if (this._redirectServer !== undefined) {
      await this._redirectServer.stop();
      this._redirectServer = undefined;
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

  private _setupBasePathRewrite(server: Server, config: HttpConfig) {
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

  private async _setupRedirectServer(config: HttpConfig) {
    this._log.info(
      `starting HTTP --> HTTPS redirect server [${config.host}:${
        config.ssl.redirectHttpFromPort
      }]`
    );

    this._redirectServer = new Server({
      host: config.host,
      port: config.ssl.redirectHttpFromPort,
    });

    this._redirectServer.ext(
      'onRequest',
      (request: Request, responseToolkit: ResponseToolkit) => {
        return responseToolkit
          .redirect(
            formatUrl({
              protocol: 'https',
              hostname: config.host,
              port: config.port,
              pathname: request.url.pathname,
              search: request.url.search,
            })
          )
          .takeover();
      }
    );

    try {
      await this._redirectServer.start();
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(err);
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

  private _getRouteFullPath(routerPath: string, routePath: string) {
    // If router's path ends with slash and route's path starts with slash,
    // we should omit one of them to have a valid concatenated path.
    const routePathStartIndex =
      routerPath.endsWith('/') && routePath.startsWith('/') ? 1 : 0;
    return `${routerPath}${routePath.slice(routePathStartIndex)}`;
  }
}
