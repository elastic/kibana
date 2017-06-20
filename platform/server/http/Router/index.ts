import * as express from 'express';

import { Headers, filterHeaders } from './headers';
import { ObjectSetting, Props, Any, TypeOf } from '../../../lib/schema';

interface Route<
  Params extends ObjectSetting<{}>,
  Query extends ObjectSetting<{}>
> {
  path: string,
  validate?: {
    params?: Params,
    query?: Query
  }
}

type Obj<T> = { [key: string]: T };

interface ResponseFactory {
  ok<T extends Obj<any>>(payload: T): KibanaResponse<T>;
  accepted<T extends Obj<any>>(payload: T): KibanaResponse<T>;
  noContent(): KibanaResponse<void>;
  badRequest<T extends Error>(err: T): KibanaResponse<T>
}

const responseFactory: ResponseFactory = {
  ok: <T extends Obj<any>>(payload: T) => new KibanaResponse(200, payload),
  accepted: <T extends Obj<any>>(payload: T) => new KibanaResponse(202, payload),
  noContent: () => new KibanaResponse<void>(204),
  badRequest: <T extends Error>(err: T) => new KibanaResponse(400, err)
};

type RequestHandler<
  RequestValue,
  Params extends Any,
  Query extends Any
> = (
  onRequestValue: RequestValue,
  req: KibanaRequest<TypeOf<Params>, TypeOf<Query>>,
  createResponse: ResponseFactory
) => Promise<KibanaResponse<any> | Obj<any>>;

// TODO Needs _some_ work
type StatusCode = 200 | 202 | 204 | 400;

class KibanaResponse<T> {
  constructor(
    readonly status: StatusCode,
    readonly payload?: T
  ) {}
}

// TODO Explore validating headers too (can't validate _all_, but you only
// receive the headers you _have_ validated).
export class KibanaRequest<
  Params extends Props = {},
  Query extends Props = {}
> {
  readonly headers: Headers;

  static validate<
    Params extends Props = {},
    Query extends Props = {}
  >(
    route: Route<ObjectSetting<Params>, ObjectSetting<Query>>,
    req: express.Request
  ): { params: Params, query: Query } {
    let params: Params;
    let query: Query;

    if (route.validate === undefined) {
      params = req.params;
      query = req.query;
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
    }

    return { query, params };
  }

  constructor(
    req: express.Request,
    readonly params: Params,
    readonly query: Query
  ) {
    this.headers = req.headers;
  }

  getFilteredHeaders(headersToKeep: string[]) {
    return filterHeaders(this.headers, headersToKeep);
  }
}

export interface RouterOptions<T> {
  onRequest?: (req: KibanaRequest) => T
}

export class Router<V> {
  readonly router = express.Router();

  constructor(
    readonly path: string,
    readonly options: RouterOptions<V> = {}
  ) {}

  get<P extends ObjectSetting<any>, Q extends ObjectSetting<any>>(
    route: Route<P, Q>,
    handler: RequestHandler<V, P, Q>
  ) {
    this.router.get(route.path, async (req, res) => {
      let valid: { params: TypeOf<P>, query: TypeOf<P> };

      // TODO Change this so we can get failures per type
      try {
        valid = KibanaRequest.validate(route, req);
      } catch(e) {
        res.status(400);
        res.json({ error: e.message });
        return;
      }

      const kibanaRequest = new KibanaRequest(req, valid.params, valid.query);

      const value = this.options.onRequest !== undefined
        ? this.options.onRequest(kibanaRequest)
        : {} as V;

      try {
        const response = await handler(
          value,
          kibanaRequest,
          responseFactory
        );

        if (response instanceof KibanaResponse) {
          res.status(response.status);

          if (response.payload === undefined) {
            res.send();
          } else if (response.payload instanceof Error) {
            // TODO Design an error format
            res.json({ error: response.payload.message });
          } else {
            res.json(response.payload);
          }
        } else {
          res.json(response);
        }
      } catch (e) {
        // TODO Specifically handle `KibanaResponseError` and validation errors.

        // Otherwise we default to something along the lines of
        res.status(500).json({ error: e.message });
      }
    });
  }

  post<P extends ObjectSetting<any>, Q extends ObjectSetting<any>>(
    route: Route<P, Q>,
    handler: RequestHandler<V, P, Q>
  ) {
    // TODO
  }

  put<P extends ObjectSetting<any>, Q extends ObjectSetting<any>>(
    route: Route<P, Q>,
    handler: RequestHandler<V, P, Q>
  ) {
    // TODO
  }

  delete<P extends ObjectSetting<any>, Q extends ObjectSetting<any>>(
    route: Route<P, Q>,
    handler: RequestHandler<V, P, Q>
  ) {
    // TODO
  }
}
