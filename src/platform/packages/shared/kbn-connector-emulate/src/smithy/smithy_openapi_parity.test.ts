/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { isRecord } from '../openapi/schema_walk';
import type { JsonSchema, OpenApiDocument } from '../openapi/types';
import { convertSmithy, isSmithyModel } from '.';

// Compares convertSmithy with smithy-openapi, AWS's own Smithy to OpenAPI conversion, on the
// EKS, Lambda and X-Ray operations the connectors call. The fixtures and how to regenerate them
// are described in __fixtures__/smithy_openapi/README.md.
const FIXTURES = join(__dirname, '__fixtures__', 'smithy_openapi');

/**
 * Where the conversions differ on purpose. Each is applied to both sides before comparing, so
 * any other difference fails the test.
 */
const KNOWN_DIFFERENCES = {
  // smithy-openapi writes integer shapes as `number` unless `useIntegerType` is set; integers
  // with their format are what the model means, and reject fractions.
  integerType: 'integers are `integer` with `int32`/`int64`, not `number`',
  // smithy-openapi keeps only the last error declared at a status; AWS can return any of them.
  errorsPerStatus: 'errors that share a status are an `anyOf`, not the last one only',
  // restJson1 sends blob payloads as raw bytes; smithy-openapi defaults to `byte` (base64).
  blobPayload: 'blob payloads are `binary`, not `byte`',
  // smithy-openapi also marks `@sensitive` maps and structures with `format: password`, which
  // means nothing for them.
  sensitive: '`format: password` only on strings',
  // Senders may leave out members with a `@default`, which receivers fill in; AWS's protocol
  // tests require servers to accept requests without them.
  requiredWithDefault: '`@required` members with a `@default` are optional',
  // AWS takes blob payloads without a `@mediaType` as any content type; the Lambda connector
  // sends Invoke payloads as JSON.
  opaquePayload: 'blob payloads without a `@mediaType` also take JSON',
  // smithy-openapi declares only the `@http` code, though an `@httpResponseCode` member sets it,
  // as Lambda Invoke's 202 for `Event` and 204 for `DryRun`.
  responseCode: 'outputs with an `@httpResponseCode` member answer at `2XX`',
} as const;

type Paths = Record<string, Record<string, Record<string, unknown>>>;

const readJson = (name: string): unknown => JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

const SCHEMA_KEYWORDS = [
  'type',
  'format',
  'enum',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'pattern',
  'minItems',
  'maxItems',
  'nullable',
] as const;

/** Resolves component refs; recursive schemas stop at the ref they repeat. */
const resolve = (document: OpenApiDocument, schema: unknown): JsonSchema => {
  let node = schema;
  for (let depth = 0; isRecord(node) && typeof node.$ref === 'string' && depth < 20; depth++) {
    const name = node.$ref.split('/').pop() ?? '';
    const { schemas } = document.components as { schemas: Record<string, unknown> };
    node = schemas[name];
  }
  return isRecord(node) ? node : {};
};

/**
 * A schema as `path: keywords` lines, such as `.cluster.name! {"type":"string"}`, with `!` for
 * required properties, `[]` for items, `{}` for map values and `|` for variants.
 */
const flatten = (
  document: OpenApiDocument,
  schema: unknown,
  prefix = '',
  seen: ReadonlySet<string> = new Set()
): string[] => {
  const ref = isRecord(schema) && typeof schema.$ref === 'string' ? schema.$ref : undefined;
  if (ref && seen.has(ref)) {
    return [`${prefix || '.'} recursive`];
  }
  const visited = ref ? new Set([...seen, ref]) : seen;
  const node = resolve(document, schema);
  const keywords: Record<string, unknown> = {};
  for (const keyword of SCHEMA_KEYWORDS) {
    if (node[keyword] !== undefined) {
      keywords[keyword] = node[keyword];
    }
  }
  if (keywords.type === 'integer') {
    // KNOWN_DIFFERENCES.integerType
    keywords.type = 'number';
    delete keywords.format;
  }
  if (keywords.format === 'password' && keywords.type !== 'string') {
    // KNOWN_DIFFERENCES.sensitive
    delete keywords.format;
  }
  if (keywords.format === 'binary') {
    // KNOWN_DIFFERENCES.blobPayload
    keywords.format = 'byte';
  }
  const required = new Set(Array.isArray(node.required) ? node.required : []);
  return [
    `${prefix || '.'} ${JSON.stringify(keywords)}`,
    ...(Array.isArray(node.oneOf) ? node.oneOf : []).flatMap((variant) =>
      flatten(document, variant, `${prefix}|`, visited)
    ),
    ...Object.entries(isRecord(node.properties) ? node.properties : {}).flatMap(
      ([name, property]) =>
        flatten(
          document,
          property,
          // KNOWN_DIFFERENCES.requiredWithDefault
          `${prefix}.${name}${
            required.has(name) && resolve(document, property).default === undefined ? '!' : ''
          }`,
          visited
        )
    ),
    ...(node.items === undefined ? [] : flatten(document, node.items, `${prefix}[]`, visited)),
    ...(isRecord(node.additionalProperties)
      ? flatten(document, node.additionalProperties, `${prefix}{}`, visited)
      : []),
  ].sort();
};

const contentOf = (document: OpenApiDocument, holder: unknown, lastVariant = false) => {
  const contents = isRecord(holder) && isRecord(holder.content) ? holder.content : {};
  return Object.fromEntries(
    Object.entries(contents)
      // KNOWN_DIFFERENCES.opaquePayload
      .filter(
        ([mediaType]) =>
          !(mediaType === 'application/json' && 'application/octet-stream' in contents)
      )
      .map(([mediaType, content]) => {
        const schema = isRecord(content) ? content.schema : undefined;
        // KNOWN_DIFFERENCES.errorsPerStatus
        const compared =
          lastVariant && isRecord(schema) && Array.isArray(schema.anyOf)
            ? schema.anyOf[schema.anyOf.length - 1]
            : schema;
        return [mediaType, flatten(document, compared)];
      })
  );
};

/** What the test compares of each operation, keyed by `operationId`. */
const describeOperations = (document: OpenApiDocument, errorsAsLastVariant: boolean) =>
  Object.fromEntries(
    Object.entries(document.paths as Paths).flatMap(([path, item]) =>
      Object.entries(item).map(([method, operation]) => [
        operation.operationId,
        {
          route: `${method.toUpperCase()} ${path}`,
          parameters: (Array.isArray(operation.parameters) ? operation.parameters : [])
            .filter(isRecord)
            .map(
              (parameter) =>
                `${parameter.in} ${parameter.name}${
                  parameter.required === true ? '!' : ''
                } ${flatten(document, parameter.schema).join(' ')}`
            )
            .sort(),
          requestBody: {
            required: isRecord(operation.requestBody) && operation.requestBody.required === true,
            content: contentOf(document, operation.requestBody),
          },
          responses: Object.fromEntries(
            Object.entries(isRecord(operation.responses) ? operation.responses : {}).map(
              ([status, response]) => [
                // KNOWN_DIFFERENCES.responseCode: the connectors' operations default to 200.
                status === '2XX' ? '200' : status,
                {
                  headers: Object.keys(
                    isRecord(response) && isRecord(response.headers) ? response.headers : {}
                  ).sort(),
                  content: contentOf(
                    document,
                    response,
                    errorsAsLastVariant && !status.startsWith('2')
                  ),
                },
              ]
            )
          ),
        },
      ])
    )
  );

describe('convertSmithy compared with smithy-openapi', () => {
  it('lists each known difference with its reason', () => {
    expect(Object.keys(KNOWN_DIFFERENCES)).toEqual([
      'integerType',
      'errorsPerStatus',
      'blobPayload',
      'sensitive',
      'requiredWithDefault',
      'opaquePayload',
      'responseCode',
    ]);
  });

  it.each(['eks', 'lambda', 'xray'])(
    'converts the %s operations the connector calls as smithy-openapi does',
    (name) => {
      const model = readJson(`${name}.smithy.json`);
      if (!isSmithyModel(model)) {
        throw new Error(`${name}.smithy.json is not a Smithy model`);
      }
      const theirs = readJson(`${name}.openapi.json`) as OpenApiDocument;

      const ours = describeOperations(convertSmithy(model), true);
      const expected = describeOperations(theirs, false);

      expect(Object.keys(ours).sort()).toEqual(Object.keys(expected).sort());
      for (const [operationId, operation] of Object.entries(expected)) {
        // Named, so a failure shows which operation differs.
        expect({ [operationId]: ours[operationId] }).toEqual({ [operationId]: operation });
      }
    }
  );
});
