/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Responder } from '../contract/types';
import { validateValue } from '../openapi/schema_violations';
import type {
  ContractOperation,
  MediaTypeContent,
  OperationResponse,
  SpecSchema,
} from '../openapi/types';
import { sampleSchema } from './sample_schema';

// Ranges such as `3XX` sort after the codes they contain.
const statusOf = ({ code }: OperationResponse): number =>
  /^\d{3}$/.test(code) ? Number(code) : /^[1-5]xx$/i.test(code) ? Number(code[0]) * 100 + 99 : 1000;

const lowestIn = (responses: readonly OperationResponse[], from: number, to: number) =>
  responses
    .filter((response) => statusOf(response) >= from && statusOf(response) < to)
    .sort((a, b) => statusOf(a) - statusOf(b))[0];

/**
 * The lowest declared 2xx response, then `2XX`, then `default`. Operations without one, such
 * as downloads that redirect or endpoints the vendor removed, get their lowest declared 3xx,
 * then their lowest declared response of any status.
 */
export const selectResponse = (
  responses: readonly OperationResponse[]
): OperationResponse | undefined =>
  lowestIn(responses, 200, 300) ??
  responses.find(({ code }) => code === 'default') ??
  lowestIn(responses, 300, 400) ??
  lowestIn(responses, 100, 600);

const toStatusCode = ({ code }: OperationResponse): number =>
  /^\d{3}$/.test(code) ? Number(code) : /^[1-5]xx$/i.test(code) ? Number(code[0]) * 100 : 200;

const baseType = (mediaType: string): string => mediaType.split(';')[0].trim().toLowerCase();
const isJson = (mediaType: string): boolean => /[/+]json$/.test(baseType(mediaType));

const parseAccept = (accept: string) =>
  accept
    .split(',')
    .map((part) => {
      const [range, ...parameters] = part.split(';').map((piece) => piece.trim());
      const quality = parameters.find((parameter) => parameter.startsWith('q='));
      return { range: range.toLowerCase(), q: quality ? Number(quality.slice(2)) : 1 };
    })
    .filter(({ range, q }) => range && q > 0)
    .sort((a, b) => b.q - a.q);

const matchesRange = (range: string, mediaType: string): boolean => {
  const type = baseType(mediaType);
  return (
    range === '*/*' ||
    range === type ||
    (range.endsWith('/*') && type.startsWith(range.slice(0, -1)))
  );
};

/**
 * Picks the response content that best satisfies the `Accept` header, preferring JSON when
 * several match. A vendor JSON type such as `application/vnd.github+json` that the spec doesn't
 * declare gets its JSON content, as vendors answer those with `application/json`. Returns
 * undefined when the response has contents but none is acceptable.
 */
export const negotiateContent = (
  contents: readonly MediaTypeContent[],
  accept: string | undefined
): MediaTypeContent | undefined => {
  const ranges = accept ? parseAccept(accept) : [{ range: '*/*', q: 1 }];
  for (const { range } of ranges) {
    const matching = contents.filter(({ mediaType }) => matchesRange(range, mediaType));
    const match = matching.find(({ mediaType }) => isJson(mediaType)) ?? matching[0];
    if (match) {
      return match;
    }
  }
  return ranges.some(({ range }) => range.endsWith('+json'))
    ? contents.find(({ mediaType }) => isJson(mediaType))
    : undefined;
};

// Vendors' examples sometimes contradict their schemas, so only conforming ones are served.
const conformingExamples = (operation: ContractOperation, { schema, examples }: MediaTypeContent) =>
  examples.filter(
    (example) =>
      validateValue(operation, schema, example, {
        path: ['body'],
        subject: 'Example',
        direction: 'response',
      }).length === 0
  );

const createSampleResponder =
  (boundary: boolean): Responder =>
  (operation, { headers: { accept } }) => {
    const {
      responses,
      spec: { document },
    } = operation;
    const response = selectResponse(responses);
    if (!response) {
      return { statusCode: 204 };
    }
    const statusCode = toStatusCode(response);
    const conforms = (schema: SpecSchema, value: unknown) =>
      validateValue(operation, schema, value, {
        path: [],
        subject: 'Example',
        direction: 'response',
      }).length === 0;
    const sample = (schema: SpecSchema | undefined, atBoundary = false) =>
      sampleSchema(schema?.schema, document, {
        pointer: schema?.pointer,
        conforms,
        boundary: atBoundary,
      });
    const headers: Record<string, string> = {};
    for (const { name, required, schema } of response.headers) {
      if (required) {
        headers[name.toLowerCase()] = String(sample(schema));
      }
    }
    const { contents } = response;
    if (contents.length === 0) {
      return { statusCode, headers };
    }
    const content = negotiateContent(contents, accept);
    if (!content) {
      const detail = `Accept ${accept} matches none of ${contents
        .map(({ mediaType }) => mediaType)
        .join(', ')}`;
      return {
        statusCode: 406,
        headers: { 'content-type': 'application/json' },
        body: { title: 'Not Acceptable', detail },
      };
    }
    headers['content-type'] = content.mediaType;
    const examples = boundary ? [] : conformingExamples(operation, content);
    const body = examples.length > 0 ? examples[0] : sample(content.schema, boundary);
    return { statusCode, headers, body };
  };

/**
 * Answers with the operation's success response (see `selectResponse`): the media type's first
 * example that matches its schema, otherwise a deterministic sample of the schema.
 */
export const sampleResponse: Responder = createSampleResponder(false);

/**
 * Answers like `sampleResponse`, but with a body sampled at the schema's upper bounds (longest
 * strings, largest numbers, fullest arrays), to test how connectors handle extreme responses.
 */
export const sampleBoundaryResponse: Responder = createSampleResponder(true);
