/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type joi from 'joi';
import type { OpenAPIV3 } from 'openapi-types';
import type { ConvertOptions, KnownParameters } from '../../type';
export declare const isNullableObjectType: (schema: joi.Schema | joi.Description) => boolean;
export declare const unwrapKbnConfigSchema: (schema: unknown) => joi.Schema;
export declare const convert: (
  kbnConfigSchema: unknown,
  { sharedSchemas, env, onCollision }?: ConvertOptions
) => {
  schema: OpenAPIV3.SchemaObject;
  shared: {
    [id: string]: OpenAPIV3.SchemaObject;
  };
};
export declare const getParamSchema: (
  knownParameters: KnownParameters,
  schemaKey: string
) => {
  optional: boolean;
};
export declare const convertQuery: (kbnConfigSchema: unknown) => {
  query: {
    name: string;
    in: string;
    required: boolean;
    schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
    description: string | undefined;
  }[];
  shared: {
    [k: string]: OpenAPIV3.SchemaObject;
  };
};
export declare const convertPathParameters: (
  kbnConfigSchema: unknown,
  knownParameters: {
    [paramName: string]: {
      optional: boolean;
    };
  }
) => {
  params: {
    name: string;
    in: string;
    required: boolean;
    schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject;
    description: string | undefined;
  }[];
  shared: {
    [k: string]: OpenAPIV3.SchemaObject;
  };
};
export declare const is: (schema: unknown) => boolean;
