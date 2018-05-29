import { Request } from 'hapi-latest';
import { ObjectType, TypeOf } from '../../config/schema';

import { filterHeaders, Headers } from './headers';
import { RouteSchemas } from './route';

export class KibanaRequest<Params, Query, Body> {
  public readonly headers: Headers;

  /**
   * Factory for creating requests. Validates the request before creating an
   * instance of a KibanaRequest.
   */
  public static from<
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType
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
    P extends ObjectType,
    Q extends ObjectType,
    B extends ObjectType
  >(
    req: Request,
    routeSchemas: RouteSchemas<P, Q, B> | undefined
  ): {
    params: TypeOf<P>;
    query: TypeOf<Q>;
    body: TypeOf<B>;
  } {
    if (routeSchemas === undefined) {
      return {
        body: {},
        params: {},
        query: {},
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

  public getFilteredHeaders(headersToKeep: string[]) {
    return filterHeaders(this.headers, headersToKeep);
  }
}
