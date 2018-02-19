import * as express from 'express';
import * as bodyParser from 'body-parser';
import { schema } from '@kbn/utils';

import { RouteMethod, RouteSchemas, RouteConfig } from './route';
import { KibanaRequest } from './request';
import { KibanaResponse, ResponseFactory, responseFactory } from './response';

export class Router {
  readonly router: express.Router = express.Router();

  constructor(readonly path: string) {}

  /**
   * Create the schemas for a route
   *
   * @returns Route schemas if `validate` is specified on the route, otherwise
   * undefined.
   */
  private routeSchemasFromRouteConfig<
    P extends schema.ObjectType,
    Q extends schema.ObjectType,
    B extends schema.ObjectType
  >(route: RouteConfig<P, Q, B>, routeMethod: RouteMethod) {
    // The type doesn't allow `validate` to be undefined, but it can still
    // happen when it's used from JavaScript.
    if (route.validate === undefined) {
      throw new Error(
        `The [${routeMethod}] at [${
          route.path
        }] does not have a 'validate' specified. Use 'false' as the value if you want to bypass validation.`
      );
    }

    return route.validate ? route.validate(schema) : undefined;
  }

  /**
   * Register a `GET` request with the router
   */
  get<
    P extends schema.ObjectType,
    Q extends schema.ObjectType,
    B extends schema.ObjectType
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'GET');
    this.router.get(
      route.path,
      async (req, res) => await this.handle(routeSchemas, req, res, handler)
    );
  }

  /**
   * Register a `POST` request with the router
   */
  post<
    P extends schema.ObjectType,
    Q extends schema.ObjectType,
    B extends schema.ObjectType
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'POST');
    this.router.post(
      route.path,
      ...Router.getBodyParsers(),
      async (req, res) => await this.handle(routeSchemas, req, res, handler)
    );
  }

  /**
   * Register a `PUT` request with the router
   */
  put<
    P extends schema.ObjectType,
    Q extends schema.ObjectType,
    B extends schema.ObjectType
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'POST');
    this.router.put(
      route.path,
      ...Router.getBodyParsers(),
      async (req, res) => await this.handle(routeSchemas, req, res, handler)
    );
  }

  /**
   * Register a `DELETE` request with the router
   */
  delete<
    P extends schema.ObjectType,
    Q extends schema.ObjectType,
    B extends schema.ObjectType
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'DELETE');
    this.router.delete(
      route.path,
      async (req, res) => await this.handle(routeSchemas, req, res, handler)
    );
  }

  /**
   * Returns list of supported body parsers.
   */
  private static getBodyParsers() {
    return [
      bodyParser.json(),
      bodyParser.raw({ type: 'application/x-ndjson' }),
      bodyParser.urlencoded({ extended: false }),
    ];
  }

  private async handle<
    P extends schema.ObjectType,
    Q extends schema.ObjectType,
    B extends schema.ObjectType
  >(
    routeSchemas: RouteSchemas<P, Q, B> | undefined,
    request: express.Request,
    response: express.Response,
    handler: RequestHandler<P, Q, B>
  ) {
    let kibanaRequest: KibanaRequest<
      schema.TypeOf<P>,
      schema.TypeOf<Q>,
      schema.TypeOf<B>
    >;

    try {
      kibanaRequest = KibanaRequest.from(request, routeSchemas);
    } catch (e) {
      // TODO Handle failed validation

      response.status(400);
      response.json({ error: e.message });
      return;
    }

    try {
      const kibanaResponse = await handler(kibanaRequest, responseFactory);

      if (kibanaResponse instanceof KibanaResponse) {
        response.status(kibanaResponse.status);

        if (kibanaResponse.payload === undefined) {
          response.send();
        } else if (kibanaResponse.payload instanceof Error) {
          // TODO Design an error format
          response.json({ error: kibanaResponse.payload.message });
        } else {
          response.json(kibanaResponse.payload);
        }
      } else {
        response.json(kibanaResponse);
      }
    } catch (e) {
      // TODO Handle `KibanaResponseError`

      // Otherwise we default to something along the lines of
      response.status(500).json({ error: e.message });
    }
  }
}

export type RequestHandler<
  P extends schema.ObjectType,
  Q extends schema.ObjectType,
  B extends schema.ObjectType
> = (
  req: KibanaRequest<schema.TypeOf<P>, schema.TypeOf<Q>, schema.TypeOf<B>>,
  createResponse: ResponseFactory
) => Promise<KibanaResponse<any> | { [key: string]: any }>;
