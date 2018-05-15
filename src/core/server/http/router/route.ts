import { ObjectType, Schema } from '../../config/schema';
export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RouteConfig<
  P extends ObjectType,
  Q extends ObjectType,
  B extends ObjectType
> {
  /**
   * The endpoint _within_ the router path to register the route. E.g. if the
   * router is registered at `/elasticsearch` and the route path is `/search`,
   * the full path for the route is `/elasticsearch/search`.
   */
  path: string;

  /**
   * A function that will be called when setting up the route and that returns
   * a schema that every request will be validated against.
   *
   * To opt out of validating the request, specify `false`.
   */
  validate: RouteValidateFactory<P, Q, B> | false;
}

export type RouteValidateFactory<
  P extends ObjectType,
  Q extends ObjectType,
  B extends ObjectType
> = (schema: Schema) => RouteSchemas<P, Q, B>;

/**
 * RouteSchemas contains the schemas for validating the different parts of a
 * request.
 */
export interface RouteSchemas<
  P extends ObjectType,
  Q extends ObjectType,
  B extends ObjectType
> {
  params?: P;
  query?: Q;
  body?: B;
}
