import * as express from 'express';
import * as bodyParser from 'body-parser';

import { Headers, filterHeaders } from './headers';
import { ObjectSetting, Props, Any, TypeOf } from '../../../lib/schema';

export interface Route<
  Params extends ObjectSetting<{}>,
  Query extends ObjectSetting<{}>,
  Body extends ObjectSetting<{}>
> {
  path: string;
  validate?: {
    params?: Params;
    query?: Query;
    body?: Body;
  };
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
  RequestValue,
  Params extends Any,
  Query extends Any,
  Body extends Any
> = (
  onRequestValue: RequestValue,
  req: KibanaRequest<TypeOf<Params>, TypeOf<Query>, TypeOf<Body>>,
  createResponse: ResponseFactory
) => Promise<KibanaResponse<any> | { [key: string]: any }>;

// TODO Needs _some_ work
export type StatusCode = 200 | 202 | 204 | 400;

export class KibanaResponse<T> {
  constructor(readonly status: StatusCode, readonly payload?: T) {}
}

// TODO Explore validating headers too (can't validate _all_, but you only
// receive the headers you _have_ validated).
export class KibanaRequest<
  Params extends Props = {},
  Query extends Props = {},
  Body extends Props = {}
> {
  readonly headers: Headers;

  static validate<
    Params extends Props = {},
    Query extends Props = {},
    Body extends Props = {}
  >(
    route: Route<
      ObjectSetting<Params>,
      ObjectSetting<Query>,
      ObjectSetting<Body>
    >,
    req: express.Request
  ): { params: Params; query: Query; body: Body } {
    let params: Params;
    let query: Query;
    let body: Body;

    if (route.validate === undefined) {
      params = req.params;
      query = req.query;
      body = req.body;
    } else {
      if (route.validate.params === undefined) {
        params = req.params;
      } else {
        params = route.validate.params.validate(req.params);
      }

      if (route.validate.query === undefined) {
        query = req.query;
      } else {
        query = route.validate.query.validate(req.query);
      }

      if (route.validate.body === undefined) {
        body = req.body;
      } else {
        body = route.validate.body.validate(req.body);
      }
    }

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

export interface RouterOptions<T> {
  onRequest?: (req: KibanaRequest) => T;
}

export class Router<V> {
  readonly router: express.Router = express.Router();

  constructor(readonly path: string, readonly options: RouterOptions<V> = {}) {}

  get<
    P extends ObjectSetting<any>,
    Q extends ObjectSetting<any>,
    B extends ObjectSetting<any>
  >(route: Route<P, Q, B>, handler: RequestHandler<V, P, Q, B>) {
    this.router.get(
      route.path,
      async (req, res) => await this.handle(route, req, res, handler)
    );
  }

  post<
    P extends ObjectSetting<any>,
    Q extends ObjectSetting<any>,
    B extends ObjectSetting<any>
  >(route: Route<P, Q, B>, handler: RequestHandler<V, P, Q, B>) {
    this.router.post(
      route.path,
      Router.getBodyParsers(),
      async (req, res) => await this.handle(route, req, res, handler)
    );
  }

  put<
    P extends ObjectSetting<any>,
    Q extends ObjectSetting<any>,
    B extends ObjectSetting<any>
  >(route: Route<P, Q, B>, handler: RequestHandler<V, P, Q, B>) {
    // TODO
  }

  delete<
    P extends ObjectSetting<any>,
    Q extends ObjectSetting<any>,
    B extends ObjectSetting<any>
  >(route: Route<P, Q, B>, handler: RequestHandler<V, P, Q, B>) {
    // TODO
  }

  /**
   * Returns supported list of body parsers.
   */
  private static getBodyParsers() {
    return [
      bodyParser.json(),
      bodyParser.raw({ type: 'application/x-ndjson' }),
      bodyParser.urlencoded({ extended: false })
    ];
  }

  private async handle<
    P extends ObjectSetting<any>,
    Q extends ObjectSetting<any>,
    B extends ObjectSetting<any>
  >(
    route: Route<P, Q, B>,
    request: express.Request,
    response: express.Response,
    handler: RequestHandler<V, P, Q, B>
  ) {
    let valid: { params: TypeOf<P>; query: TypeOf<P>; body: TypeOf<B> };

    // TODO Change this so we can get failures per type
    try {
      valid = KibanaRequest.validate(route, request);
    } catch (e) {
      response.status(400);
      response.json({ error: e.message });
      return;
    }

    const kibanaRequest = new KibanaRequest(
      request,
      valid.params,
      valid.query,
      valid.body
    );

    const value =
      this.options.onRequest !== undefined
        ? this.options.onRequest(kibanaRequest)
        : {} as V;

    try {
      const kibanaResponse = await handler(
        value,
        kibanaRequest,
        responseFactory
      );

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
