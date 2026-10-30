/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractResponse } from '../contract/types';
import type { ContractOperation } from '../openapi/types';
import { findResponse } from '../openapi/validate_response';
import { isBareXmlValue, isXmlMediaType, toXml } from './xml_codec';

const mediaTypeOf = (contentType: string | undefined): string =>
  (contentType ?? '').split(';')[0].trim().toLowerCase();

const getHeader = (
  headers: Readonly<Record<string, string>> | undefined,
  name: string
): string | undefined =>
  Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name)?.[1];

/**
 * Writes an XML response's body as XML when it is a value, as samples and fixtures give it,
 * using the schema the operation declares for the status and media type.
 */
export const serializeXmlBody = (
  operation: ContractOperation,
  response: ContractResponse
): ContractResponse => {
  const mediaType = mediaTypeOf(getHeader(response.headers, 'content-type'));
  const { body } = response;
  if (!isXmlMediaType(mediaType) || body === undefined || body === null) {
    return response;
  }
  const content = findResponse(operation.responses, response.statusCode)?.contents.find(
    (candidate) => mediaTypeOf(candidate.mediaType) === mediaType
  );
  const schema = content?.schema?.schema;
  const { document } = operation.spec;
  // Strings are XML text already, unless the schema describes a scalar and the text isn't XML.
  if (!schema || (typeof body === 'string' && !isBareXmlValue(body, schema, document))) {
    return response;
  }
  return { ...response, body: toXml(body, schema, document) };
};
