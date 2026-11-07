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

interface MediaRange {
  readonly type: string;
  readonly subtype: string;
  readonly q: number;
}

const parseAccept = (accept: string): MediaRange[] =>
  accept.split(',').flatMap((part) => {
    const [range, ...parameters] = part.split(';').map((piece) => piece.trim());
    const [type, subtype] = range.toLowerCase().split('/');
    if (!type || !subtype) {
      return [];
    }
    const quality = parameters.find((parameter) => parameter.startsWith('q='));
    const q = quality ? Number(quality.slice(2)) : 1;
    return [{ type, subtype, q: Number.isFinite(q) ? q : 0 }];
  });

const covers = (range: MediaRange, type: string, subtype: string): boolean =>
  (range.type === '*' || range.type === type) &&
  (range.subtype === '*' || range.subtype === subtype);

const specificity = ({ type, subtype }: MediaRange): number =>
  Number(type !== '*') + Number(subtype !== '*');

// RFC 9110 §12.5.1: a media type gets the quality of the most specific range that covers it, so
// `application/json;q=0, */*` excludes JSON.
const qualityOf = (ranges: readonly MediaRange[], mediaType: string): number => {
  const [type, subtype = ''] = baseType(mediaType).split('/');
  const [best] = ranges
    .filter((range) => covers(range, type, subtype))
    .sort((a, b) => specificity(b) - specificity(a));
  return best?.q ?? 0;
};

// What a range such as `*/*` or `text/*` declared by the spec is sent as when the client accepts
// nothing more specific.
const WILDCARD_DEFAULTS: Readonly<Record<string, string>> = {
  '*': 'application/json',
  application: 'application/json',
  text: 'text/plain',
};

// The concrete types a declared content can be sent as: itself, or for a declared range, the
// concrete types the client accepts that it covers, then its default.
const concreteTypes = (declared: string, ranges: readonly MediaRange[]): string[] => {
  const [type, subtype = ''] = baseType(declared).split('/');
  if (type !== '*' && subtype !== '*') {
    return [declared];
  }
  const accepted = ranges
    .filter((range) => specificity(range) === 2 && (type === '*' || range.type === type))
    .map((range) => `${range.type}/${range.subtype}`);
  const fallback = WILDCARD_DEFAULTS[type];
  return fallback ? [...accepted, fallback] : accepted;
};

// OpenAPI: a concrete media type declared by the spec takes precedence over a range covering it.
const declaredSpecificity = (mediaType: string): number => {
  const [type, subtype = ''] = baseType(mediaType).split('/');
  return specificity({ type, subtype, q: 1 });
};

/**
 * Picks the response content that best satisfies the `Accept` header: the highest quality, then
 * JSON, then the most specific declaration, then the spec's order. Content the spec declares for a media range, such as `text/*`,
 * is sent as a concrete type the client accepts. A vendor JSON type such as
 * `application/vnd.github+json` that the spec doesn't declare gets its JSON content, as vendors
 * answer those with `application/json`. Returns undefined when the response has contents but
 * none is acceptable.
 */
export const negotiateContent = (
  contents: readonly MediaTypeContent[],
  accept: string | undefined
): MediaTypeContent | undefined => {
  const ranges = accept ? parseAccept(accept) : [{ type: '*', subtype: '*', q: 1 }];
  const candidates = contents
    .flatMap((content, order) =>
      concreteTypes(content.mediaType, ranges).map((mediaType) => ({
        content: { ...content, mediaType },
        q: qualityOf(ranges, mediaType),
        json: isJson(mediaType),
        declared: declaredSpecificity(content.mediaType),
        order,
      }))
    )
    .filter(({ q }) => q > 0)
    .sort(
      (a, b) =>
        b.q - a.q || Number(b.json) - Number(a.json) || b.declared - a.declared || a.order - b.order
    );
  if (candidates.length > 0) {
    return candidates[0].content;
  }
  return ranges.some(({ subtype, q }) => subtype.endsWith('+json') && q > 0)
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
