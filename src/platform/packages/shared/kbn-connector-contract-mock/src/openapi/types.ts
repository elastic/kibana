/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type OpenApiDocument = Record<string, unknown>;

export type JsonSchema = Record<string, unknown>;

/** OpenAPI 3.0 schemas are an extended subset of draft-04; 3.1 and later use draft 2020-12. */
export type SchemaDialect = 'openapi-3.0' | 'draft-2020-12';

/** A loaded spec. Operations share it, and their schemas stay in place in its document. */
export interface ContractSpec {
  readonly document: OpenApiDocument;
  readonly dialect: SchemaDialect;
}

/**
 * A schema with its JSON pointer into the spec document, so refs resolve where they are.
 * OpenAPI 3.1 and later also allow the boolean schemas `true` and `false`.
 */
export interface SpecSchema {
  readonly pointer: string;
  readonly schema: JsonSchema | boolean;
}

/** A schema of an operation, with a human-readable location such as `query.limit`. */
export interface LocatedSchema {
  readonly kind: 'parameter' | 'request' | 'response';
  readonly location: string;
  readonly schema: SpecSchema;
}

/** `querystring` (OpenAPI 3.2) describes the whole query string as one `content` value. */
export type ParameterLocation = 'path' | 'query' | 'querystring' | 'header' | 'cookie';

export interface MediaTypeContent {
  readonly mediaType: string;
  readonly schema?: SpecSchema;
}

export interface OperationParameter {
  readonly name: string;
  readonly in: ParameterLocation;
  readonly required: boolean;
  /** `style` and `explode` only apply to parameters described by a `schema`, not `content`. */
  readonly style: string;
  readonly explode: boolean;
  readonly schema?: SpecSchema;
  /** The single media type of a parameter described by `content` instead of `schema`. */
  readonly content?: MediaTypeContent;
}

export interface OperationHeader {
  readonly name: string;
  readonly required: boolean;
  readonly schema?: SpecSchema;
}

export interface OperationRequestBody {
  readonly required: boolean;
  readonly contents: readonly MediaTypeContent[];
}

export interface OperationResponse {
  /** A status code, a range such as `2XX`, or `default`. */
  readonly code: string;
  readonly contents: readonly MediaTypeContent[];
  readonly headers: readonly OperationHeader[];
}

export interface ServerVariable {
  readonly default: string;
  readonly enum?: readonly string[];
}

export interface OperationServer {
  readonly url: string;
  readonly variables: Readonly<Record<string, ServerVariable>>;
}

export interface ContractOperation {
  /** The `operationId`, or `METHOD /path` when the spec declares none. */
  readonly id: string;
  /** Lowercase HTTP method. */
  readonly method: string;
  readonly path: string;
  readonly servers: readonly OperationServer[];
  readonly parameters: readonly OperationParameter[];
  readonly requestBody?: OperationRequestBody;
  readonly responses: readonly OperationResponse[];
  readonly spec: ContractSpec;
}
