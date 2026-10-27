/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** A field's type, as a reference page states it: `int64`, `string[]`, `array of object`. */
export type FieldType =
  | {
      readonly kind: 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'any';
      readonly format?: string;
    }
  | { readonly kind: 'array'; readonly items: FieldType };

/** Bounds and patterns from a page's constraints, applied to the types they fit. */
export interface FieldConstraints {
  readonly minimum?: number;
  readonly maximum?: number;
  /** The bound is excluded from the range (`< 100`, `> 0`). */
  readonly exclusiveMinimum?: boolean;
  readonly exclusiveMaximum?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly pattern?: string;
}

/** A parameter, body field, response field or object attribute. */
export interface ReferenceField {
  readonly name: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly nullable?: boolean;
  readonly deprecated?: boolean;
  readonly description?: string;
  /** Allowed values, as written on the page. */
  readonly enum?: readonly string[];
  /** As written on the page; converted to the field's type. */
  readonly default?: string;
  readonly example?: string;
  readonly constraints?: FieldConstraints;
  /** The properties of an object, or of the objects an array holds. */
  readonly children?: readonly ReferenceField[];
}

export type ParameterLocation = 'path' | 'query' | 'header';

export interface ReferenceParameter extends ReferenceField {
  readonly in: ParameterLocation;
}

/** A credential the endpoint takes, from the page's authorization section. */
export type ReferenceSecurity =
  | { readonly type: 'apiKey'; readonly in: 'header' | 'query'; readonly name: string }
  | { readonly type: 'http'; readonly scheme: 'bearer' | 'basic' };

export interface ReferenceResponse {
  /** A status code, such as `200`. */
  readonly status: string;
  readonly description?: string;
  /** The response body's fields, when the page lists them. */
  readonly fields?: readonly ReferenceField[];
  /** The object page the page refers to instead, such as Databricks' "Returns the Alert object". */
  readonly object?: ObjectRef;
  /** The page's example response body. */
  readonly example?: unknown;
}

/** Names an object page within the scope (e.g. API group) it was published in. */
export interface ObjectRef {
  readonly scope: string;
  readonly name: string;
}

export interface ReferenceEndpoint {
  /** An `operationId`, when the vendor's pages give each endpoint a stable name. */
  readonly id?: string;
  /** Lowercase HTTP method. */
  readonly method: string;
  readonly path: string;
  /** The endpoint's base URL, when the page states one. */
  readonly serverUrl?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly deprecated?: boolean;
  readonly parameters: readonly ReferenceParameter[];
  readonly requestBody?: {
    readonly required: boolean;
    readonly mediaType: string;
    readonly fields: readonly ReferenceField[];
  };
  readonly responses: readonly ReferenceResponse[];
  readonly security: readonly ReferenceSecurity[];
}

/** A page that describes an object, which endpoint pages refer to. */
export interface ReferenceObject extends ObjectRef {
  readonly fields: readonly ReferenceField[];
  readonly example?: unknown;
}

/** What a parser reads from one page; index and guide pages yield nothing. */
export type ParsedPage =
  | { readonly endpoint: ReferenceEndpoint }
  | { readonly object: ReferenceObject }
  | undefined;

/** One fetched page of a Markdown API reference. */
export interface MarkdownReferencePage {
  readonly url: string;
  readonly markdown: string;
}
