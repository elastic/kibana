import { Request } from 'hapi';
import { schema } from '@kbn/utils';

import { Headers, filterHeaders } from './headers';
import { RouteSchemas } from './route';

export class KibanaRequest<Params, Query, Body> {
  readonly headers: Headers;

  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   */
  static from<
    P extends schema.ObjectType,
    Q extends schema.ObjectType,
    B extends schema.ObjectType
  >(req: Request, routeSchemas: RouteSchemas<P, Q, B> | undefined) {
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
    P extends schema.ObjectType,
    Q extends schema.ObjectType,
    B extends schema.ObjectType
  >(
    req: Request,
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
        body: {},
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
        : routeSchemas.body.validate(req.payload);

    return { query, params, body };
  }

  constructor(
    req: Request,
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
