import * as express from 'express';
import * as bodyParser from 'body-parser';
import { schema, Schema } from '@elastic/kbn-utils';

import { Headers, filterHeaders } from './headers';

/**
 * Schemas for validating the request on a route.
 */
export type RouteSchemas<
  Params extends schema.ObjectSetting<any>,
  Query extends schema.ObjectSetting<any>,
  Body extends schema.ObjectSetting<any>
> = (schema: Schema) => {
  params?: Params;
  query?: Query;
  body?: Body;
};

export interface RouteConfig<
  Params extends schema.ObjectSetting<any>,
  Query extends schema.ObjectSetting<any>,
  Body extends schema.ObjectSetting<any>
> {
  path: string;
  validate?: RouteSchemas<Params, Query, Body>
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
  Params extends schema.Any,
  Query extends schema.Any,
  Body extends schema.Any
> = (
  req: KibanaRequest<
    schema.TypeOf<Params>,
    schema.TypeOf<Query>,
    schema.TypeOf<Body>
  >,
  createResponse: ResponseFactory
) => Promise<KibanaResponse<any> | { [key: string]: any }>;

// TODO Needs _some_ work
export type StatusCode = 200 | 202 | 204 | 400;

export class KibanaResponse<T> {
  constructor(readonly status: StatusCode, readonly payload?: T) {}
}

export class KibanaRequest<
  Params extends schema.Props,
  Query extends schema.Props,
  Body extends schema.Props
> {
  readonly headers: Headers;

  /**
   * Validates the different parts of a request based on the schemas defined for
   * the route. Builds up the actual params, query and body object that will be
   * received in the route handler.
   */
  static validate<
    Params extends schema.Props,
    Query extends schema.Props,
    Body extends schema.Props
  >(
    route: RouteConfig<
      schema.ObjectSetting<Params>,
      schema.ObjectSetting<Query>,
      schema.ObjectSetting<Body>
    >,
    req: express.Request
  ): { params: Params; query: Query; body: Body } {
    const noParams = {} as Params;
    const noQuery = {} as Query;
    const noBody = {} as Body;

    // When `validate` isn't specific on a route we return all fields as empty
    if (route.validate === undefined) {
      // TODO During development, should we log this?

      return {
        params: noParams,
        query: noQuery,
        body: noBody
      };
    }

    const routeSchemas = route.validate(schema);

    if (routeSchemas == null) {
      return {
        params: noParams,
        query: noQuery,
        body: noBody
      };
    }

    const params =
      routeSchemas.params === undefined
        ? noParams
        : routeSchemas.params.validate(req.params);

    const query =
      routeSchemas.query === undefined
        ? noQuery
        : routeSchemas.query.validate(req.query);

    const body =
      routeSchemas.body === undefined
        ? noBody
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

  get<
    P extends schema.ObjectSetting<any>,
    Q extends schema.ObjectSetting<any>,
    B extends schema.ObjectSetting<any>
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    this.router.get(
      route.path,
      async (req, res) => await this.handle(route, req, res, handler)
    );
  }

  post<
    P extends schema.ObjectSetting<any>,
    Q extends schema.ObjectSetting<any>,
    B extends schema.ObjectSetting<any>
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    this.router.post(
      route.path,
      ...Router.getBodyParsers(),
      async (req, res) => await this.handle(route, req, res, handler)
    );
  }

  put<
    P extends schema.ObjectSetting<any>,
    Q extends schema.ObjectSetting<any>,
    B extends schema.ObjectSetting<any>
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    this.router.put(
      route.path,
      ...Router.getBodyParsers(),
      async (req, res) => await this.handle(route, req, res, handler)
    );
  }

  delete<
    P extends schema.ObjectSetting<any>,
    Q extends schema.ObjectSetting<any>,
    B extends schema.ObjectSetting<any>
  >(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>) {
    this.router.delete(
      route.path,
      async (req, res) => await this.handle(route, req, res, handler)
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
    P extends schema.ObjectSetting<any>,
    Q extends schema.ObjectSetting<any>,
    B extends schema.ObjectSetting<any>
  >(
    route: RouteConfig<P, Q, B>,
    request: express.Request,
    response: express.Response,
    handler: RequestHandler<P, Q, B>
  ) {
    let requestParts: {
      params: schema.TypeOf<P>;
      query: schema.TypeOf<P>;
      body: schema.TypeOf<B>;
    };

    try {
      requestParts = KibanaRequest.validate(route, request);
    } catch (e) {
      response.status(400);
      response.json({ error: e.message });
      return;
    }

    const kibanaRequest = new KibanaRequest(
      request,
      requestParts.params,
      requestParts.query,
      requestParts.body
    );

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
      // TODO Specifically handle `KibanaResponseError` and validation errors.

      // Otherwise we default to something along the lines of
      response.status(500).json({ error: e.message });
    }
  }
}
