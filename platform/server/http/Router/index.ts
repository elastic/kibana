import * as express from 'express';

import { ObjectSetting, Any, TypeOf } from '../../../lib/schema';
import { KibanaRequest } from './Request';
import { KibanaResponse, KibanaResponseBuilder } from './Response';

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

export type RequestHandler<
  RequestValue,
  Params extends Any,
  Query extends Any,
  Body extends Any
> = (
  onRequestValue: RequestValue,
  req: KibanaRequest<TypeOf<Params>, TypeOf<Query>, TypeOf<Body>>,
  res: KibanaResponse
) => Promise<KibanaResponse>;

export interface RouterOptions<T> {
  onRequest?: (req: KibanaRequest) => T;
}

export class Router<V> {
  readonly router: express.Router = express.Router();

  constructor(readonly path: string, readonly options: RouterOptions<V> = {}) {}

  all<
    P extends ObjectSetting<any>,
    Q extends ObjectSetting<any>,
    B extends ObjectSetting<any>
  >(route: Route<P, Q, B>, handler: RequestHandler<V, P, Q, B>) {
    this.router.all(
      route.path,
      async (req, res, next) =>
        await this.handle(route, req, res, next, handler)
    );
  }

  get<
    P extends ObjectSetting<any>,
    Q extends ObjectSetting<any>,
    B extends ObjectSetting<any>
  >(route: Route<P, Q, B>, handler: RequestHandler<V, P, Q, B>) {
    this.router.get(
      route.path,
      async (req, res, next) =>
        await this.handle(route, req, res, next, handler)
    );
  }

  post<
    P extends ObjectSetting<any>,
    Q extends ObjectSetting<any>,
    B extends ObjectSetting<any>
  >(route: Route<P, Q, B>, handler: RequestHandler<V, P, Q, B>) {
    this.router.post(
      route.path,
      async (req, res, next) =>
        await this.handle(route, req, res, next, handler)
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

  private async handle<
    P extends ObjectSetting<any>,
    Q extends ObjectSetting<any>,
    B extends ObjectSetting<any>
  >(
    route: Route<P, Q, B>,
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
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

    const kibanaResponse = new KibanaResponseBuilder(response);

    try {
      const value =
        this.options.onRequest !== undefined
          ? this.options.onRequest(kibanaRequest)
          : {} as V;

      await handler(value, kibanaRequest, kibanaResponse);
    } catch (e) {
      // TODO Specifically handle `KibanaResponseError` and validation errors.
      kibanaResponse.internalServerError(e);
    }

    if (kibanaResponse.isFinal()) {
      kibanaResponse.send();
    } else {
      next();
    }
  }
}
