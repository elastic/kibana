/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sampleSchema } from '../engine/sample_schema';
import type { ContractOperation, OpenApiDocument, SpecSchema } from '../openapi';
import type { MediaTypeContent } from '../openapi/types';
import { getAtPointer, refToPointer } from '../openapi/json_pointer';
import { validateValue } from '../openapi/schema_violations';
import { isRecord } from '../openapi/schema_walk';

// How many `$ref`s deep schemas are inlined; deeper ones keep their `$ref`.
const INLINE_DEPTH = 4;

export interface DescribedContent {
  readonly mediaType: string;
  /** The schema, with `$ref`s inlined a few levels deep. */
  readonly schema?: unknown;
  readonly examples: readonly unknown[];
  /** A value that conforms to the schema: its first conforming example, else a sample. */
  readonly sample?: unknown;
}

/** What an OpenAPI operation accepts and answers, e.g. to write a fixture for it. */
export interface OperationDescription {
  readonly id: string;
  /** Uppercase HTTP method. */
  readonly method: string;
  readonly path: string;
  readonly source?: string;
  readonly parameters: ReadonlyArray<{
    readonly name: string;
    readonly in: string;
    readonly required: boolean;
    readonly schema?: unknown;
  }>;
  readonly requestBody?: { readonly required: boolean; readonly contents: DescribedContent[] };
  readonly responses: ReadonlyArray<{
    /** A status code, a range such as `4XX`, or `default`. */
    readonly status: string;
    readonly headers: ReadonlyArray<{ name: string; required: boolean; schema?: unknown }>;
    readonly contents: DescribedContent[];
  }>;
}

const inline = (node: unknown, document: OpenApiDocument, depth: number): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => inline(item, document, depth));
  }
  if (!isRecord(node)) {
    return node;
  }
  if (typeof node.$ref === 'string') {
    if (depth >= INLINE_DEPTH) {
      return node;
    }
    const { $ref, ...siblings } = node;
    const target = inline(getAtPointer(document, refToPointer($ref)), document, depth + 1);
    return isRecord(target) ? { ...target, ...siblings } : target;
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, inline(value, document, depth)])
  );
};

/** Describes an operation: its parameters, request body and responses, with samples. */
export const describeOperation = (operation: ContractOperation): OperationDescription => {
  const {
    id,
    method,
    path,
    parameters,
    requestBody,
    responses,
    spec: { document, source },
  } = operation;
  const show = (schema: SpecSchema | undefined) =>
    schema === undefined ? {} : { schema: inline(schema.schema, document, 0) };
  const conforms = (schema: SpecSchema, value: unknown) =>
    validateValue(operation, schema, value, {
      path: [],
      subject: 'Example',
      direction: 'response',
    }).length === 0;
  const describeContent = (
    { mediaType, schema, examples }: MediaTypeContent,
    withSample: boolean
  ): DescribedContent => {
    const conforming = schema ? examples.filter((example) => conforms(schema, example)) : examples;
    const sample =
      conforming.length > 0
        ? conforming[0]
        : schema && sampleSchema(schema.schema, document, { pointer: schema.pointer, conforms });
    return {
      mediaType,
      ...show(schema),
      examples,
      ...(withSample && sample !== undefined ? { sample } : {}),
    };
  };
  return {
    id,
    method: method.toUpperCase(),
    path,
    ...(source === undefined ? {} : { source }),
    parameters: parameters.map(({ name, in: location, required, schema }) => ({
      name,
      in: location,
      required,
      ...show(schema),
    })),
    ...(requestBody
      ? {
          requestBody: {
            required: requestBody.required,
            contents: requestBody.contents.map((content) => describeContent(content, false)),
          },
        }
      : {}),
    responses: responses.map(({ code, headers, contents }) => ({
      status: code,
      headers: headers.map(({ name, required, schema }) => ({ name, required, ...show(schema) })),
      contents: contents.map((content) => describeContent(content, true)),
    })),
  };
};
