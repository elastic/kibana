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
import type { ContractOperation, MediaTypeContent, OperationResponse } from '../openapi/types';
import { sampleSchema } from './sample_schema';

const statusOf = ({ code }: OperationResponse): number =>
  /^\d{3}$/.test(code) ? Number(code) : /^2xx$/i.test(code) ? 299 : 1000;

/** The lowest declared 2xx response, falling back to `2XX` and then `default`. */
export const selectSuccessResponse = (
  responses: readonly OperationResponse[]
): OperationResponse | undefined =>
  [...responses]
    .filter((response) => statusOf(response) < 300 && statusOf(response) >= 200)
    .sort((a, b) => statusOf(a) - statusOf(b))[0] ??
  responses.find(({ code }) => code === 'default');

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

/**
 * Answers with the operation's success response: the media type's first example that matches
 * its schema, otherwise a deterministic sample of the schema.
 */
export const sampleResponse: Responder = (operation, { headers: { accept } }) => {
  const {
    responses,
    spec: { document },
  } = operation;
  const response = selectSuccessResponse(responses);
  if (!response) {
    return { statusCode: 204 };
  }
  const statusCode = /^\d{3}$/.test(response.code) ? Number(response.code) : 200;
  const headers: Record<string, string> = {};
  for (const { name, required, schema } of response.headers) {
    if (required) {
      headers[name.toLowerCase()] = String(sampleSchema(schema?.schema, document));
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
  const examples = conformingExamples(operation, content);
  const body = examples.length > 0 ? examples[0] : sampleSchema(content.schema?.schema, document);
  return { statusCode, headers, body };
};
