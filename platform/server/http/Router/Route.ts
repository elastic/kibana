import { schema, Schema } from '@elastic/kbn-utils';
export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

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
