/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromXml, isXmlMediaType } from '../xml/xml_codec';
import { coerceValue } from './coerce_value';
import type { Direction } from './schema_violations';
import { validateValue } from './schema_violations';
import type { ContractOperation, MediaTypeContent, Violation } from './types';

const FORM_MEDIA_TYPE = 'application/x-www-form-urlencoded';

const SUBJECTS = { request: 'Request', response: 'Response' } as const;

const getMediaType = (contentType = ''): string => contentType.split(';')[0].trim().toLowerCase();

// Specs key content by media type, by range such as `text/*`, or by `*/*`.
const findContent = (contents: readonly MediaTypeContent[], mediaType: string) => {
  const [type] = mediaType.split('/');
  return [mediaType, `${type}/*`, '*/*']
    .map((candidate) => contents.find((content) => getMediaType(content.mediaType) === candidate))
    .find(Boolean);
};

// Multipart, binary and XML bodies arrive as text that their schemas don't describe. AWS's JSON
// RPC protocols send JSON as `application/x-amz-json-1.0` and `-1.1`.
const canValidate = (mediaType: string): boolean =>
  /[/+]json$/.test(mediaType) ||
  /^application\/x-amz-json-1\.[01]$/.test(mediaType) ||
  mediaType === FORM_MEDIA_TYPE ||
  mediaType.startsWith('text/');

const toFormFields = (body: string): Record<string, string | string[]> => {
  const fields: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(body)) {
    const previous = fields[key];
    fields[key] = previous === undefined ? value : [previous, value].flat();
  }
  return fields;
};

export interface ContentInput {
  readonly contentType?: string;
  readonly body: unknown;
  readonly direction: Direction;
}

/** Checks that a body has a media type the operation declares, and validates it against its schema. */
export const validateContent = (
  operation: ContractOperation,
  contents: readonly MediaTypeContent[],
  { contentType, body, direction }: ContentInput
): Violation[] => {
  const subject = SUBJECTS[direction];
  // A response body without a Content-Type is taken to be the only media type the operation
  // declares, as is a request body when that is raw bytes, which clients often send without one.
  // Opaque blobs also take JSON, but raw bytes are what they default to.
  const only =
    contents.length === 1
      ? contents[0]
      : contents.find(({ mediaType }) => getMediaType(mediaType) === 'application/octet-stream');
  const assumed =
    only &&
    (direction === 'response' || getMediaType(only.mediaType) === 'application/octet-stream')
      ? getMediaType(only.mediaType)
      : '';
  const mediaType = getMediaType(contentType) || assumed;
  const content = findContent(contents, mediaType);
  if (!content) {
    const declared = contents.map((candidate) => candidate.mediaType).join(', ');
    return [
      {
        path: ['header', 'content-type'],
        code: 'content-type',
        message: `${subject} content type ${mediaType || '(none)'} is not one of ${declared}`,
      },
    ];
  }
  if (!canValidate(mediaType) && !isXmlMediaType(mediaType)) {
    return [];
  }
  // XML documents are read as the value their schema describes; fixtures may give it directly.
  const xml =
    isXmlMediaType(mediaType) && typeof body === 'string'
      ? fromXml(body, content.schema?.schema, operation.spec.document)
      : undefined;
  if (xml && 'error' in xml) {
    return [{ path: ['body'], code: 'xml', message: `${subject} body is not XML: ${xml.error}` }];
  }
  const value = xml
    ? xml.value
    : mediaType === FORM_MEDIA_TYPE && typeof body === 'string'
    ? coerceValue(toFormFields(body), content.schema?.schema, operation.spec.document)
    : body;
  return validateValue(operation, content.schema, value, {
    path: ['body'],
    subject: `${subject} body`,
    direction,
  });
};
