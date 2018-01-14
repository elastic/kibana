import * as express from 'express';
import * as bodyParser from 'body-parser';
import { schema, Schema } from '@elastic/kbn-utils';

import { Headers, filterHeaders } from './headers';

type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RouteConfig<
  P extends schema.ObjectSetting,
  Q extends schema.ObjectSetting,
  B extends schema.ObjectSetting
> {
  path: string;
  validate: RouteValidateFactory<P, Q, B> | false;
}

export type RouteValidateFactory<
  P extends schema.ObjectSetting,
  Q extends schema.ObjectSetting,
  B extends schema.ObjectSetting
> = (schema: Schema) => RouteSchemas<P, Q, B>;

/**
 * RouteSchemas contains the schemas for validating the different parts of a
 * request.
 */
export interface RouteSchemas<
  P extends schema.ObjectSetting,
  Q extends schema.ObjectSetting,
  B extends schema.ObjectSetting
> {
  params?: P;
  query?: Q;
  body?: B;
}

export interface ResponseFactory {
  ok<T extends { [key: string]: any }>(payload: T): KibanaResponse<T>;
  accepted<T extends { [key: string]: any }>(payload: T): KibanaResponse<T>;
  noContent(): KibanaResponse<void>;
  badRequest<T extends Error>(err: T): KibanaResponse<T>;
}

const responseFactory: ResponseFactory = {
  ok: <T extends { [key: string]: any }>(payload: T) =>
    new KibanaResponse(200, payload),
  accepted: <T extends { [key: string]: any }>(payload: T) =>
    new KibanaResponse(202, payload),
  noContent: () => new KibanaResponse<void>(204),
  badRequest: <T extends Error>(err: T) => new KibanaResponse(400, err)
};

export type RequestHandler<
  P extends schema.ObjectSetting,
  Q extends schema.ObjectSetting,
  B extends schema.ObjectSetting
> = (
  req: KibanaRequest<schema.TypeOf<P>, schema.TypeOf<Q>, schema.TypeOf<B>>,
  createResponse: ResponseFactory
) => Promise<KibanaResponse<any> | { [key: string]: any }>;

// TODO Needs _some_ work
export type StatusCode = 200 | 202 | 204 | 400;

export class KibanaResponse<T> {
  constructor(readonly status: StatusCode, readonly payload?: T) {}
}

export class KibanaRequest<Params, Query, Body> {
  readonly headers: Headers;

  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   */
  static from<
    P extends schema.ObjectSetting,
    Q extends schema.ObjectSetting,
    B extends schema.ObjectSetting
  >(req: express.Request, routeSchemas: RouteSchemas<P, Q, B> | undefined) {
    const requestParts = KibanaRequest.validate(req, routeSchemas);
    return new KibanaRequest(
      req,
      requestParts.params,
      requestParts.query,
      requestParts.body
    );
  }

  /**
   * Validates the different parts of a request based on the schemas defined for
   * the route. Builds up the actual params, query and body object that will be
   * received in the route handler.
   */
  private static validate<
    P extends schema.ObjectSetting,
    Q extends schema.ObjectSetting,
    B extends schema.ObjectSetting
  >(
    req: express.Request,
    routeSchemas: RouteSchemas<P, Q, B> | undefined
  ): {
    params: schema.TypeOf<P>;
    query: schema.TypeOf<Q>;
    body: schema.TypeOf<B>;
  } {
    if (routeSchemas === undefined) {
      return {
        params: {},
        query: {},
        body: {}
      };
    }

    const params =
      routeSchemas.params === undefined
        ? {}
        : routeSchemas.params.validate(req.params);

    const query =
      routeSchemas.query === undefined
        ? {}
        : routeSchemas.query.validate(req.query);

    const body =
      routeSchemas.body === undefined
        ? {}
        : routeSchemas.body.validate(req.body);

    return { query, params, body };
  }

  constructor(
    req: express.Request,
    readonly params: Params,
    readonly query: Query,
    readonly body: Body
  ) {
    this.headers = req.headers;
  }

  getFilteredHeaders(headersToKeep: string[]) {
    return filterHeaders(this.headers, headersToKeep);
  }
}

export class Router {
  readonly router: express.Router = express.Router();

  constructor(readonly path: string) {}

  private routeSchemasFromRouteConfig<
    P extends schema.ObjectSetting,
    Q extends schema.ObjectSetting,
    B extends schema.ObjectSetting
  >(route: RouteConfig<P, Q, B>, routeMethod: RouteMethod) {
    // The type doesn't allow `validate` to be undefined, but it can still
    // happen when it's used from JavaScript.
    if (route.validate === undefined) {
      throw new Error(
        `The [${routeMethod}] at [${
          route.path
        }] does not have a 'validation' specified. Use 'false' as the value if you want to bypass validation.`
      );
    }

    return route.validate ? route.validate(schema) : undefined;
  }

  get<
    P extends schema.ObjectSetting,
    Q extends schema.ObjectSetting,
    B extends schema.ObjectSetting
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'GET');
    this.router.get(
      route.path,
      async (req, res) => await this.handle(routeSchemas, req, res, handler)
    );
  }

  post<
    P extends schema.ObjectSetting,
    Q extends schema.ObjectSetting,
    B extends schema.ObjectSetting
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'POST');
    this.router.post(
      route.path,
      ...Router.getBodyParsers(),
      async (req, res) => await this.handle(routeSchemas, req, res, handler)
    );
  }

  put<
    P extends schema.ObjectSetting,
    Q extends schema.ObjectSetting,
    B extends schema.ObjectSetting
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    const routeSchemas = this.routeSchemasFromRouteConfig(route, 'POST');
    this.router.put(
      route.path,
      ...Router.getBodyParsers(),
      async (req, res) => await this.handle(routeSchemas, req, res, handler)
    );
  }

  delete<
    P extends schema.ObjectSetting,
    Q extends schema.ObjectSetting,
    B extends schema.ObjectSetting
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
      bodyParser.urlencoded({ extended: false })
    ];
  }

  private async handle<
    P extends schema.ObjectSetting,
    Q extends schema.ObjectSetting,
    B extends schema.ObjectSetting
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
